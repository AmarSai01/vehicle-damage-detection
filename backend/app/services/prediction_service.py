"""Prediction and model-status services."""

from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException

from backend.app.core.config import PROJECT_ROOT, get_settings
from ml.inference.predictor import get_predictor
from ml.preprocessing.preprocessing import ImageValidationError

VALID_MODELS = {"custom_cnn", "mobilenetv2", "both"}


def load_comparison() -> dict[str, Any]:
    settings = get_settings()
    path = PROJECT_ROOT / settings.evaluation_dir / "comparison.json"
    candidates = [
        path,
        PROJECT_ROOT / "ml" / "artifacts" / "evaluation" / "comparison.json",
    ]
    for c in candidates:
        if c.exists():
            with open(c, encoding="utf-8") as f:
                return json.load(f)
    return {
        "status": "not_trained",
        "message": "Evaluation results will appear after training.",
        "models": {
            "custom_cnn": {"status": "not_trained", "message": "Not trained yet."},
            "mobilenetv2": {"status": "not_trained", "message": "Not trained yet."},
        },
    }


def get_models_info() -> dict[str, Any]:
    predictor = get_predictor()
    return {
        "models": predictor.status(expose_paths=False),
        "classes": [
            predictor.display_names.get(c, c) for c in predictor.class_names
        ],
        "comparison": load_comparison(),
    }


def run_prediction(image_bytes: bytes, model: str = "both") -> dict[str, Any]:
    if model not in VALID_MODELS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid model '{model}'. "
                "Use 'custom_cnn', 'mobilenetv2', or 'both'."
            ),
        )

    predictor = get_predictor()
    status = predictor.status(expose_paths=False)

    if model == "both":
        needed = ["custom_cnn", "mobilenetv2"]
    else:
        needed = [model]

    missing = [m for m in needed if not status.get(m, {}).get("available")]
    if missing:
        raise HTTPException(
            status_code=503,
            detail={
                "message": (
                    "Selected model(s) not available: "
                    + ", ".join(missing)
                    + ". Train the model before inference."
                ),
                "models": {m: status.get(m) for m in needed},
            },
        )

    try:
        return predictor.predict_bytes(image_bytes, model=model)
    except ImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {type(exc).__name__}",
        ) from exc
