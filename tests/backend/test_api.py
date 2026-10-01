"""Backend API tests — use synthetic images only; never fabricate ML metrics."""

from __future__ import annotations

import io

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient
from PIL import Image
from starlette.datastructures import Headers

from backend.app.main import app
from backend.app.utils.files import validate_upload


@pytest.fixture()
def client():
    return TestClient(app)


def _make_png_bytes(size=(64, 64), color=(20, 40, 60)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return buf.getvalue()


def test_health(client: TestClient):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "models" in data
    assert "custom_cnn" in data["models"]
    assert "mobilenetv2" in data["models"]
    # Must not expose filesystem paths to clients
    for meta in data["models"].values():
        assert "path" not in meta


def test_models_endpoint(client: TestClient):
    res = client.get("/api/models")
    assert res.status_code == 200
    data = res.json()
    assert "classes" in data
    assert len(data["classes"]) == 6
    assert data["comparison"] is not None
    assert data["comparison"]["status"] in {"not_trained", "evaluated"}
    for meta in data["models"].values():
        assert "path" not in meta


def test_comparison_endpoint(client: TestClient):
    res = client.get("/api/comparison")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "models" in data


def test_visualizations_endpoint(client: TestClient):
    res = client.get("/api/visualizations")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "metrics" in data
    assert "history" in data
    assert "comparison" in data
    assert "custom_cnn" in data["metrics"]
    assert "mobilenetv2" in data["metrics"]
    # If artifacts exist, confusion matrices must be 6x6 real arrays
    for key in ("custom_cnn", "mobilenetv2"):
        block = data["metrics"][key]
        if block.get("available"):
            cm = block["confusion_matrix"]
            assert isinstance(cm, list) and len(cm) == 6
            assert all(len(row) == 6 for row in cm)
            assert len(block["per_class"]) == 6
            assert "path" not in block
            assert "model_path" not in block
    for key in ("custom_cnn", "mobilenetv2"):
        hist = data["history"][key]
        if hist.get("available"):
            assert hist.get("accuracy") is not None
            assert hist.get("val_accuracy") is not None
            assert hist.get("loss") is not None
            assert hist.get("val_loss") is not None


def test_unsupported_format(client: TestClient):
    res = client.post(
        "/api/predict",
        files={"file": ("notes.txt", b"hello", "text/plain")},
        data={"model": "custom_cnn"},
    )
    assert res.status_code == 415


def test_empty_file(client: TestClient):
    res = client.post(
        "/api/predict",
        files={"file": ("empty.png", b"", "image/png")},
        data={"model": "mobilenetv2"},
    )
    assert res.status_code == 400


def test_corrupt_image(client: TestClient):
    res = client.post(
        "/api/predict",
        files={"file": ("bad.png", b"not-an-image", "image/png")},
        data={"model": "custom_cnn"},
    )
    assert res.status_code in {400, 503}


def test_invalid_model_choice(client: TestClient):
    png = _make_png_bytes()
    res = client.post(
        "/api/predict",
        files={"file": ("car.png", png, "image/png")},
        data={"model": "resnet50"},
    )
    assert res.status_code == 400


def test_predict_schema_or_unavailable(client: TestClient):
    png = _make_png_bytes()
    res = client.post(
        "/api/predict",
        files={"file": ("car.png", png, "image/png")},
        data={"model": "custom_cnn"},
    )
    if res.status_code == 503:
        detail = res.json()["detail"]
        text = detail["message"] if isinstance(detail, dict) else str(detail)
        assert "not available" in text.lower() or "train" in text.lower()
    elif res.status_code == 200:
        data = res.json()
        assert data["selected_model"] == "custom_cnn"
        assert "prediction" in data
        pred = data["prediction"]
        assert pred["available"] is True
        assert pred["class"] is not None
        assert pred["confidence"] is not None
        assert pred["probabilities"] is not None
        assert len(pred["probabilities"]) == 6
        assert "path" not in pred
    else:
        pytest.fail(f"Unexpected status {res.status_code}: {res.text}")


def test_oversized_rejected():
    png = _make_png_bytes()
    upload = UploadFile(
        filename="big.png",
        file=io.BytesIO(png),
        headers=Headers({"content-type": "image/png"}),
    )
    with pytest.raises(HTTPException) as exc:
        validate_upload(upload, png, {".png"}, max_bytes=1)
    assert exc.value.status_code == 413
