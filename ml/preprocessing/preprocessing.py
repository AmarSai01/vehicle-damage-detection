"""Image preprocessing utilities for Custom CNN and MobileNetV2."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import numpy as np
from PIL import Image, UnidentifiedImageError

ModelKind = Literal["custom_cnn", "mobilenetv2", "shared"]

SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


class ImageValidationError(ValueError):
    """Raised when an uploaded or dataset image fails validation."""


def validate_image_file(
    path: Path,
    max_size_bytes: int | None = None,
    allowed_exts: set[str] | None = None,
) -> None:
    allowed = allowed_exts or SUPPORTED_FORMATS
    if not path.exists():
        raise ImageValidationError(f"File not found: {path}")
    if path.suffix.lower() not in allowed:
        raise ImageValidationError(
            f"Unsupported format '{path.suffix}'. Allowed: {sorted(allowed)}"
        )
    if max_size_bytes is not None and path.stat().st_size > max_size_bytes:
        raise ImageValidationError(
            f"File too large ({path.stat().st_size} bytes). Max: {max_size_bytes}"
        )
    try:
        with Image.open(path) as img:
            img.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageValidationError(f"Corrupt or unreadable image: {path}") from exc


def load_pil_image(path: Path | str) -> Image.Image:
    path = Path(path)
    validate_image_file(path)
    # Re-open after verify (verify() can leave file in bad state)
    img = Image.open(path)
    return img.convert("RGB")


def load_pil_from_bytes(data: bytes) -> Image.Image:
    from io import BytesIO

    try:
        img = Image.open(BytesIO(data))
        img.verify()
    except Exception as exc:
        raise ImageValidationError("Corrupt or unreadable image bytes") from exc
    img = Image.open(BytesIO(data))
    return img.convert("RGB")


def resize_image(img: Image.Image, size: int = 224) -> Image.Image:
    return img.resize((size, size), Image.Resampling.BILINEAR)


def preprocess_for_custom_cnn(img: Image.Image, size: int = 224) -> np.ndarray:
    """Resize and scale pixels to [0, 1]. Returns float32 array (H, W, C)."""
    img = resize_image(img, size)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return arr


def preprocess_for_mobilenetv2(img: Image.Image, size: int = 224) -> np.ndarray:
    """Resize and apply MobileNetV2 / ImageNet preprocess_input."""
    import tensorflow as tf

    img = resize_image(img, size)
    arr = np.asarray(img, dtype=np.float32)
    arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr)
    return np.asarray(arr, dtype=np.float32)


def preprocess_image(
    img: Image.Image,
    model_kind: ModelKind,
    size: int = 224,
) -> np.ndarray:
    if model_kind == "custom_cnn":
        return preprocess_for_custom_cnn(img, size)
    if model_kind == "mobilenetv2":
        return preprocess_for_mobilenetv2(img, size)
    # shared: [0, 1] — used only for generic visualization, not training
    return preprocess_for_custom_cnn(img, size)


def preprocess_batch(
    images: list[Image.Image],
    model_kind: ModelKind,
    size: int = 224,
) -> np.ndarray:
    batch = [preprocess_image(im, model_kind, size) for im in images]
    return np.stack(batch, axis=0)


def encode_labels(labels: list[str], class_names: list[str]) -> np.ndarray:
    index = {c: i for i, c in enumerate(class_names)}
    missing = sorted({l for l in labels if l not in index})
    if missing:
        raise ValueError(f"Unknown labels: {missing}. Expected: {class_names}")
    return np.array([index[l] for l in labels], dtype=np.int32)


def decode_label(index: int, class_names: list[str]) -> str:
    if index < 0 or index >= len(class_names):
        raise ValueError(f"Label index {index} out of range for {class_names}")
    return class_names[index]
