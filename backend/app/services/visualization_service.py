"""Load visualization payloads from existing evaluation artifacts (read-only)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.app.core.config import PROJECT_ROOT
from ml.config import get_class_names, load_config

CLASS_DISPLAY = {
    "dent": "Dent",
    "scratch": "Scratch",
    "crack": "Crack",
    "glass_shatter": "Glass Shatter",
    "lamp_broken": "Lamp Broken",
    "tire_flat": "Tire Flat",
}


def _eval_dir() -> Path:
    return PROJECT_ROOT / "ml" / "artifacts" / "evaluation"


def _history_dir() -> Path:
    return PROJECT_ROOT / "ml" / "artifacts" / "history"


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _sanitize_metrics(raw: dict[str, Any] | None, model_id: str) -> dict[str, Any]:
    if raw is None:
        return {
            "available": False,
            "model_id": model_id,
            "message": "Evaluation metrics not available for this model.",
        }

    classes = get_class_names(load_config())
    display = [CLASS_DISPLAY.get(c, c) for c in classes]
    per_class_raw = raw.get("per_class") or {}
    per_class = []
    for c in classes:
        row = per_class_raw.get(c) or {}
        per_class.append(
            {
                "class_id": c,
                "class_name": CLASS_DISPLAY.get(c, c),
                "precision": row.get("precision"),
                "recall": row.get("recall"),
                "f1": row.get("f1"),
                "support": row.get("support"),
            }
        )

    cm = raw.get("confusion_matrix")
    return {
        "available": True,
        "model_id": model_id,
        "display_name": "Custom CNN" if model_id == "custom_cnn" else "MobileNetV2",
        "accuracy": raw.get("accuracy"),
        "precision_macro": raw.get("precision_macro"),
        "recall_macro": raw.get("recall_macro"),
        "f1_macro": raw.get("f1_macro"),
        "num_samples": raw.get("num_samples"),
        "class_ids": classes,
        "class_names": display,
        "confusion_matrix": cm,
        "per_class": per_class,
        # intentionally omit filesystem paths
    }


def _sanitize_history(raw: dict[str, Any] | None, model_id: str) -> dict[str, Any]:
    if raw is None:
        return {
            "available": False,
            "model_id": model_id,
            "message": "Training history not available for this model.",
        }

    # Map common Keras History keys
    train_acc = raw.get("accuracy") or raw.get("acc")
    val_acc = raw.get("val_accuracy") or raw.get("val_acc")
    train_loss = raw.get("loss")
    val_loss = raw.get("val_loss")

    epochs = 0
    for series in (train_acc, val_acc, train_loss, val_loss):
        if isinstance(series, list):
            epochs = max(epochs, len(series))

    return {
        "available": True,
        "model_id": model_id,
        "display_name": "Custom CNN" if model_id == "custom_cnn" else "MobileNetV2",
        "epochs": list(range(1, epochs + 1)),
        "accuracy": train_acc,
        "val_accuracy": val_acc,
        "loss": train_loss,
        "val_loss": val_loss,
    }


def _sanitize_comparison(raw: dict[str, Any] | None) -> dict[str, Any]:
    if raw is None:
        return {
            "available": False,
            "status": "not_trained",
            "message": "Comparison metrics not available.",
            "models": {},
        }
    return {
        "available": raw.get("status") == "evaluated",
        "status": raw.get("status"),
        "message": raw.get("message"),
        "models": raw.get("models") or {},
        "table": raw.get("table"),
        "note": raw.get("note"),
    }


def build_visualizations_payload() -> dict[str, Any]:
    """Assemble chart-ready data from existing on-disk evaluation artifacts."""
    eval_dir = _eval_dir()
    hist_dir = _history_dir()

    cnn_metrics = _read_json(eval_dir / "custom_cnn_metrics.json")
    mnv_metrics = _read_json(eval_dir / "mobilenetv2_metrics.json")
    cnn_hist = _read_json(hist_dir / "custom_cnn_history.json")
    mnv_hist = _read_json(hist_dir / "mobilenetv2_history.json")
    comparison = _read_json(eval_dir / "comparison.json")

    payload = {
        "status": "ok",
        "sources": {
            "custom_cnn_metrics": cnn_metrics is not None,
            "mobilenetv2_metrics": mnv_metrics is not None,
            "custom_cnn_history": cnn_hist is not None,
            "mobilenetv2_history": mnv_hist is not None,
            "comparison": comparison is not None,
        },
        "classes": [
            {"id": c, "name": CLASS_DISPLAY.get(c, c)} for c in get_class_names(load_config())
        ],
        "metrics": {
            "custom_cnn": _sanitize_metrics(cnn_metrics, "custom_cnn"),
            "mobilenetv2": _sanitize_metrics(mnv_metrics, "mobilenetv2"),
        },
        "history": {
            "custom_cnn": _sanitize_history(cnn_hist, "custom_cnn"),
            "mobilenetv2": _sanitize_history(mnv_hist, "mobilenetv2"),
        },
        "comparison": _sanitize_comparison(comparison),
    }
    return payload
