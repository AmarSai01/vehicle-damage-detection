"""ML unit tests using synthetic images only (never used as training data)."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from ml.config import get_class_names, load_config
from ml.models.custom_cnn import build_custom_cnn
from ml.models.mobilenetv2 import build_mobilenetv2
from ml.preprocessing.dataset_loader import Sample, detect_layout, normalize_label
from ml.preprocessing.preprocessing import (
    ImageValidationError,
    encode_labels,
    preprocess_for_custom_cnn,
    preprocess_for_mobilenetv2,
    validate_image_file,
)
from ml.preprocessing.split_dataset import stratified_split


def test_class_mapping():
    classes = get_class_names()
    # Order matches verified CarDD_COCO category_id 1..6
    assert classes == [
        "dent",
        "scratch",
        "crack",
        "glass_shatter",
        "lamp_broken",
        "tire_flat",
    ]
    assert normalize_label("glass shatter") == "glass_shatter"
    assert normalize_label("Glass Shatter") == "glass_shatter"
    assert normalize_label("tire flat") == "tire_flat"
    assert normalize_label("lamp broken") == "lamp_broken"
    assert normalize_label("unknown_damage") is None


def test_choose_primary_category_max_area():
    from ml.preprocessing.dataset_loader import choose_primary_category

    anns = [
        {"category_id": 1, "area": 10.0},
        {"category_id": 2, "area": 100.0},
        {"category_id": 1, "area": 5.0},
    ]
    chosen = choose_primary_category(anns)
    assert chosen is not None
    cid, total_area, count = chosen
    assert cid == 2
    assert total_area == 100.0
    assert count == 1


def test_missing_dataset_layout(tmp_path: Path):
    missing = tmp_path / "nope"
    assert detect_layout(missing) == "missing"


def test_classification_layout_detection(tmp_path: Path):
    for name in ["dent", "scratch", "crack"]:
        d = tmp_path / name
        d.mkdir()
        Image.new("RGB", (32, 32), (10, 20, 30)).save(d / "a.jpg")
    assert detect_layout(tmp_path) == "classification"


def test_preprocessing_shapes(tmp_path: Path):
    path = tmp_path / "sample.png"
    Image.new("RGB", (100, 80), (5, 10, 15)).save(path)
    validate_image_file(path)
    img = Image.open(path).convert("RGB")
    cnn = preprocess_for_custom_cnn(img, size=64)
    assert cnn.shape == (64, 64, 3)
    assert cnn.dtype == np.float32
    assert 0.0 <= cnn.min() and cnn.max() <= 1.0

    # MobileNet preprocess may go outside [0,1]
    mnv = preprocess_for_mobilenetv2(img, size=64)
    assert mnv.shape == (64, 64, 3)


def test_invalid_image(tmp_path: Path):
    bad = tmp_path / "bad.png"
    bad.write_bytes(b"not-an-image")
    with pytest.raises(ImageValidationError):
        validate_image_file(bad)


def test_encode_labels():
    classes = get_class_names()
    y = encode_labels(["dent", "scratch", "dent"], classes)
    assert list(y) == [0, 1, 0]


def test_custom_cnn_output_shape():
    model = build_custom_cnn(num_classes=6, input_shape=(64, 64, 3))
    x = np.random.rand(2, 64, 64, 3).astype(np.float32)
    y = model.predict(x, verbose=0)
    assert y.shape == (2, 6)
    np.testing.assert_allclose(y.sum(axis=1), np.ones(2), rtol=1e-5, atol=1e-5)


def test_mobilenetv2_output_shape():
    model, base = build_mobilenetv2(
        num_classes=6, input_shape=(96, 96, 3), weights=None
    )
    assert base.trainable is False
    x = np.random.rand(2, 96, 96, 3).astype(np.float32)
    y = model.predict(x, verbose=0)
    assert y.shape == (2, 6)


def test_stratified_split_no_leakage():
    classes = get_class_names()
    samples = []
    for cls in classes:
        for i in range(10):
            samples.append(
                Sample(image_path=f"/tmp/synthetic/{cls}_{i}.jpg", label=cls, source="test")
            )
    split = stratified_split(samples, seed=42, class_names=classes)
    train_p = {s.image_path for s in split.train}
    val_p = {s.image_path for s in split.val}
    test_p = {s.image_path for s in split.test}
    assert not (train_p & val_p)
    assert not (train_p & test_p)
    assert not (val_p & test_p)
    assert len(train_p) + len(val_p) + len(test_p) == len(samples)


def test_config_loads():
    cfg = load_config()
    assert cfg["dataset"]["name"] == "CarDD"
    assert len(cfg["dataset"]["classes"]) == 6
