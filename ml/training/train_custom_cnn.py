"""Train the Custom CNN on the prepared CarDD stratified split."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Ensure project root on sys.path
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.config import get_artifacts_paths, get_class_names, get_num_classes, load_config
from ml.models.custom_cnn import build_custom_cnn, compile_custom_cnn, describe_architecture
from ml.paths import ensure_dir
from ml.preprocessing.split_dataset import load_split
from ml.training.common_training import (
    configure_gpu_memory_growth,
    default_callbacks,
    make_tf_dataset,
    model_file_size_mb,
    save_history,
    set_reproducible_seed,
)


def parse_args() -> argparse.Namespace:
    cfg = load_config()
    p = argparse.ArgumentParser(description="Train Custom CNN on CarDD")
    p.add_argument("--epochs", type=int, default=cfg["training"]["epochs"])
    p.add_argument("--batch-size", type=int, default=cfg["training"]["batch_size"])
    p.add_argument("--learning-rate", type=float, default=cfg["training"]["learning_rate"])
    p.add_argument("--image-size", type=int, default=cfg["preprocessing"]["image_size"])
    p.add_argument("--seed", type=int, default=cfg["split"]["seed"])
    p.add_argument("--augment", action="store_true", help="Enable light augmentation")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    cfg = load_config()
    set_reproducible_seed(args.seed)
    device = configure_gpu_memory_growth()
    print(f"Device: {device}")

    split = load_split()
    class_names = get_class_names(cfg)
    num_classes = get_num_classes(cfg)
    paths = get_artifacts_paths(cfg)
    ensure_dir(paths["models"])

    print(f"Classes ({num_classes}): {class_names}")
    print(
        f"Samples — train: {len(split.train)}, val: {len(split.val)}, test: {len(split.test)}"
    )
    print("Architecture:", json.dumps(describe_architecture(num_classes), indent=2))

    train_ds = make_tf_dataset(
        split.train,
        model_kind="custom_cnn",
        batch_size=args.batch_size,
        image_size=args.image_size,
        class_names=class_names,
        shuffle=True,
        seed=args.seed,
        augment=args.augment,
    )
    val_ds = make_tf_dataset(
        split.val,
        model_kind="custom_cnn",
        batch_size=args.batch_size,
        image_size=args.image_size,
        class_names=class_names,
        shuffle=False,
        seed=args.seed,
        augment=False,
    )

    model = build_custom_cnn(
        num_classes=num_classes,
        input_shape=(args.image_size, args.image_size, 3),
    )
    model = compile_custom_cnn(model, learning_rate=args.learning_rate)
    model.summary()

    callbacks = default_callbacks(
        model_name="custom_cnn",
        monitor=cfg["training"]["checkpoint_monitor"],
        mode=cfg["training"]["checkpoint_mode"],
        patience=cfg["training"]["early_stopping_patience"],
        reduce_lr_patience=cfg["training"]["reduce_lr_patience"],
        reduce_lr_factor=cfg["training"]["reduce_lr_factor"],
        min_lr=cfg["training"]["min_lr"],
    )

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        callbacks=callbacks,
        verbose=1,
    )
    hist_path = save_history(history, "custom_cnn")

    best_path = paths["models"] / "custom_cnn.keras"
    # Ensure final best weights are saved even if checkpoint path differs
    model.save(best_path)

    meta = {
        "model": "custom_cnn",
        "classes": class_names,
        "epochs_trained": len(history.history.get("loss", [])),
        "seed": args.seed,
        "batch_size": args.batch_size,
        "learning_rate": args.learning_rate,
        "image_size": args.image_size,
        "parameters": int(model.count_params()),
        "model_size_mb": model_file_size_mb(best_path),
        "history_path": str(hist_path),
        "model_path": str(best_path),
        "device": device,
        "status": "trained",
    }
    with open(paths["history"] / "custom_cnn_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Saved model → {best_path}")
    print(f"Saved history → {hist_path}")
    print("Next: python -m ml.evaluation.evaluate_models")


if __name__ == "__main__":
    main()
