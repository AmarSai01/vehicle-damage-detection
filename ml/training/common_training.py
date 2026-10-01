"""Shared training utilities: seeds, datasets, callbacks, history I/O."""

from __future__ import annotations

import json
import os
import random
from pathlib import Path
from typing import Any, Callable, Iterator

import numpy as np
from PIL import Image

from ml.config import get_class_names, get_artifacts_paths, load_config
from ml.paths import ensure_dir
from ml.preprocessing.dataset_loader import Sample
from ml.preprocessing.preprocessing import (
    preprocess_for_custom_cnn,
    preprocess_for_mobilenetv2,
)


def set_reproducible_seed(seed: int = 42) -> None:
    """Set seeds for Python, NumPy, and TensorFlow."""
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    np.random.seed(seed)
    try:
        import tensorflow as tf

        tf.random.set_seed(seed)
        # Deterministic ops where available (may reduce performance)
        try:
            tf.config.experimental.enable_op_determinism()
        except Exception:
            pass
    except ImportError:
        pass


def configure_gpu_memory_growth() -> str:
    """Enable GPU memory growth if a GPU is present. Returns device description."""
    try:
        import tensorflow as tf

        gpus = tf.config.list_physical_devices("GPU")
        for gpu in gpus:
            try:
                tf.config.experimental.set_memory_growth(gpu, True)
            except Exception:
                pass
        if gpus:
            return f"GPU ({len(gpus)} device(s) detected)"
        return "CPU (no compatible GPU detected by TensorFlow)"
    except ImportError:
        return "CPU (TensorFlow not installed)"


def _load_xy(
    samples: list[Sample],
    model_kind: str,
    image_size: int,
    class_names: list[str],
) -> tuple[np.ndarray, np.ndarray]:
    label_to_idx = {c: i for i, c in enumerate(class_names)}
    xs: list[np.ndarray] = []
    ys: list[int] = []
    skipped = 0
    for s in samples:
        try:
            img = Image.open(s.image_path).convert("RGB")
            if model_kind == "mobilenetv2":
                arr = preprocess_for_mobilenetv2(img, image_size)
            else:
                arr = preprocess_for_custom_cnn(img, image_size)
            xs.append(arr)
            ys.append(label_to_idx[s.label])
        except Exception:
            skipped += 1
    if not xs:
        raise RuntimeError("No valid images loaded for training batch construction.")
    if skipped:
        print(f"Warning: skipped {skipped} unreadable sample(s).")
    return np.stack(xs, axis=0), np.array(ys, dtype=np.int32)


def make_tf_dataset(
    samples: list[Sample],
    model_kind: str,
    batch_size: int,
    image_size: int,
    class_names: list[str],
    shuffle: bool = False,
    seed: int = 42,
    augment: bool = False,
):
    """
    Build a tf.data pipeline.

    For academic-scale datasets, images are loaded via a generator to avoid
    holding everything in RAM when possible; small sets can still fit in memory.
    """
    import tensorflow as tf

    label_to_idx = {c: i for i, c in enumerate(class_names)}
    paths = [s.image_path for s in samples]
    labels = [label_to_idx[s.label] for s in samples]

    path_ds = tf.data.Dataset.from_tensor_slices((paths, labels))
    if shuffle:
        path_ds = path_ds.shuffle(buffer_size=min(len(paths), 1000), seed=seed)

    def _parse(path, label):
        path_str = path.numpy().decode("utf-8")
        img = Image.open(path_str).convert("RGB")
        if model_kind == "mobilenetv2":
            arr = preprocess_for_mobilenetv2(img, image_size)
        else:
            arr = preprocess_for_custom_cnn(img, image_size)
        return arr, np.int32(label)

    def _tf_parse(path, label):
        image, lbl = tf.py_function(_parse, [path, label], [tf.float32, tf.int32])
        image.set_shape([image_size, image_size, 3])
        lbl.set_shape([])
        return image, lbl

    ds = path_ds.map(_tf_parse, num_parallel_calls=tf.data.AUTOTUNE)

    if augment and model_kind == "custom_cnn":
        aug = tf.keras.Sequential(
            [
                tf.keras.layers.RandomFlip("horizontal"),
                tf.keras.layers.RandomRotation(0.05),
                tf.keras.layers.RandomZoom(0.05),
            ],
            name="light_augmentation",
        )

        def _aug(image, label):
            return aug(image, training=True), label

        ds = ds.map(_aug, num_parallel_calls=tf.data.AUTOTUNE)

    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds


def default_callbacks(
    model_name: str,
    monitor: str = "val_accuracy",
    mode: str = "max",
    patience: int = 10,
    reduce_lr_patience: int = 5,
    reduce_lr_factor: float = 0.5,
    min_lr: float = 1e-7,
) -> list:
    """Early stopping, LR schedule, and best-model checkpointing."""
    from tensorflow import keras

    cfg = load_config()
    paths = get_artifacts_paths(cfg)
    ckpt_dir = ensure_dir(paths["checkpoints"] / model_name)
    best_path = paths["models"] / f"{model_name}.keras"
    ensure_dir(paths["models"])

    return [
        keras.callbacks.ModelCheckpoint(
            filepath=str(best_path),
            monitor=monitor,
            mode=mode,
            save_best_only=True,
            verbose=1,
        ),
        keras.callbacks.ModelCheckpoint(
            filepath=str(ckpt_dir / "epoch_{epoch:03d}.keras"),
            monitor=monitor,
            mode=mode,
            save_best_only=False,
            save_freq="epoch",
            verbose=0,
        ),
        keras.callbacks.EarlyStopping(
            monitor=monitor,
            mode=mode,
            patience=patience,
            restore_best_weights=True,
            verbose=1,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            mode="min",
            factor=reduce_lr_factor,
            patience=reduce_lr_patience,
            min_lr=min_lr,
            verbose=1,
        ),
        keras.callbacks.CSVLogger(
            str(ensure_dir(paths["history"]) / f"{model_name}_log.csv")
        ),
    ]


def save_history(history: Any, model_name: str) -> Path:
    cfg = load_config()
    paths = get_artifacts_paths(cfg)
    out = ensure_dir(paths["history"])
    path = out / f"{model_name}_history.json"
    # history may be keras History or a plain dict
    data = history.history if hasattr(history, "history") else dict(history)
    serializable = {k: [float(v) for v in vals] for k, vals in data.items()}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(serializable, f, indent=2)
    return path


def model_file_size_mb(path: Path) -> float | None:
    if not path.exists():
        return None
    return round(path.stat().st_size / (1024 * 1024), 4)
