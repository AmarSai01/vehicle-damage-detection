"""Production inference helper used by the FastAPI backend."""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from ml.config import get_artifacts_paths, get_class_names, load_config
from ml.preprocessing.preprocessing import (
    ImageValidationError,
    load_pil_from_bytes,
    load_pil_image,
    preprocess_for_custom_cnn,
    preprocess_for_mobilenetv2,
)


@dataclass
class ModelPrediction:
    model_name: str
    class_name: str | None
    confidence: float | None
    inference_time_ms: float | None
    available: bool
    message: str | None = None
    probabilities: dict[str, float] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "model_name": self.model_name,
            "class": self.class_name,
            "confidence": self.confidence,
            "inference_time_ms": self.inference_time_ms,
            "available": self.available,
            "message": self.message,
            "probabilities": self.probabilities,
        }


class DamagePredictor:
    """
    Lazy-loads Keras models once and runs dual-model inference.

    Never returns fabricated predictions. If a model file is missing,
    returns available=False with a clear message.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._models: dict[str, Any] = {}
        self._load_errors: dict[str, str] = {}
        self.cfg = load_config()
        self.class_names = get_class_names(self.cfg)
        self.image_size = int(self.cfg["preprocessing"]["image_size"])
        self.paths = get_artifacts_paths(self.cfg)
        self.display_names = self.cfg["dataset"].get("class_display_names", {})

    def model_paths(self) -> dict[str, Path]:
        return {
            "custom_cnn": self.paths["models"] / self.cfg["models"]["custom_cnn"]["filename"],
            "mobilenetv2": self.paths["models"]
            / self.cfg["models"]["mobilenetv2"]["filename"],
        }

    def status(self, *, expose_paths: bool = False) -> dict[str, Any]:
        """Public model status. Paths omitted unless explicitly requested (never for API)."""
        result = {}
        for name, path in self.model_paths().items():
            loaded = name in self._models
            exists = path.exists()
            entry: dict[str, Any] = {
                "id": name,
                "display_name": "Custom CNN" if name == "custom_cnn" else "MobileNetV2",
                "file_exists": exists,
                "loaded": loaded,
                "available": exists,
                "error": self._load_errors.get(name),
                "message": (
                    None
                    if exists
                    else "Model not available. Train the model before running inference."
                ),
            }
            if expose_paths:
                entry["path"] = str(path)
            result[name] = entry
        return result

    def _ensure_loaded(self, name: str) -> Any | None:
        with self._lock:
            if name in self._models:
                return self._models[name]
            path = self.model_paths()[name]
            if not path.exists():
                self._load_errors[name] = "Model artifact not found."
                return None
            try:
                import tensorflow as tf

                model = tf.keras.models.load_model(path)
                self._models[name] = model
                self._load_errors.pop(name, None)
                return model
            except Exception as exc:
                # Do not leak absolute paths in error strings
                self._load_errors[name] = f"Failed to load model: {type(exc).__name__}"
                return None

    def _predict_one(
        self,
        name: str,
        model_kind: str,
        image: Image.Image,
    ) -> ModelPrediction:
        model = self._ensure_loaded(name)
        if model is None:
            return ModelPrediction(
                model_name=name,
                class_name=None,
                confidence=None,
                inference_time_ms=None,
                available=False,
                message=self._load_errors.get(name)
                or "Model not available. Train the model before running inference.",
            )

        if model_kind == "mobilenetv2":
            arr = preprocess_for_mobilenetv2(image, self.image_size)
        else:
            arr = preprocess_for_custom_cnn(image, self.image_size)
        batch = np.expand_dims(arr, axis=0)

        t0 = time.perf_counter()
        probs = model.predict(batch, verbose=0)[0]
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        idx = int(np.argmax(probs))
        class_id = self.class_names[idx]
        conf = float(probs[idx])
        # Stable key order matching class_names (display labels)
        prob_map = {
            self.display_names.get(c, c): float(probs[i])
            for i, c in enumerate(self.class_names)
        }

        return ModelPrediction(
            model_name=name,
            class_name=self.display_names.get(class_id, class_id),
            confidence=conf,
            inference_time_ms=round(elapsed_ms, 3),
            available=True,
            message=None,
            probabilities=prob_map,
        )

    def predict_image(
        self,
        image: Image.Image,
        model: str = "both",
    ) -> dict[str, Any]:
        """
        Run inference for one model or both.

        model: 'custom_cnn' | 'mobilenetv2' | 'both'
        """
        allowed = {"custom_cnn", "mobilenetv2", "both"}
        if model not in allowed:
            raise ValueError(f"Invalid model '{model}'. Expected one of {sorted(allowed)}.")

        result: dict[str, Any] = {
            "selected_model": model,
            "classes": [self.display_names.get(c, c) for c in self.class_names],
        }

        if model in {"custom_cnn", "both"}:
            result["custom_cnn"] = self._predict_one(
                "custom_cnn", "custom_cnn", image
            ).to_dict()
        if model in {"mobilenetv2", "both"}:
            result["mobilenetv2"] = self._predict_one(
                "mobilenetv2", "mobilenetv2", image
            ).to_dict()

        # Convenience single-result block when one model selected
        if model == "custom_cnn":
            result["prediction"] = result["custom_cnn"]
        elif model == "mobilenetv2":
            result["prediction"] = result["mobilenetv2"]
        else:
            result["prediction"] = None

        return result

    def predict_path(self, path: Path | str, model: str = "both") -> dict[str, Any]:
        image = load_pil_image(path)
        return self.predict_image(image, model=model)

    def predict_bytes(self, data: bytes, model: str = "both") -> dict[str, Any]:
        image = load_pil_from_bytes(data)
        return self.predict_image(image, model=model)


# Module-level singleton for the API
_predictor: DamagePredictor | None = None
_predictor_lock = threading.Lock()


def get_predictor() -> DamagePredictor:
    global _predictor
    with _predictor_lock:
        if _predictor is None:
            _predictor = DamagePredictor()
        return _predictor
