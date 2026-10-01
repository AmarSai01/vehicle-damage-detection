"""API response / request schemas."""

from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field

ModelChoice = Literal["custom_cnn", "mobilenetv2", "both"]


class ModelPredictionSchema(BaseModel):
    model_name: str
    class_: Optional[str] = Field(None, alias="class")
    confidence: Optional[float] = None
    inference_time_ms: Optional[float] = None
    available: bool
    message: Optional[str] = None
    probabilities: Optional[Dict[str, float]] = None

    model_config = {"populate_by_name": True}


class PredictResponse(BaseModel):
    selected_model: str
    classes: list[str] = []
    prediction: Optional[Dict[str, Any]] = None
    custom_cnn: Optional[Dict[str, Any]] = None
    mobilenetv2: Optional[Dict[str, Any]] = None
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    models: Dict[str, Any]


class ModelsResponse(BaseModel):
    models: Dict[str, Any]
    classes: list[str]
    comparison: Optional[Dict[str, Any]] = None


class ComparisonResponse(BaseModel):
    status: str
    message: Optional[str] = None
    models: Dict[str, Any]
    table: Optional[Dict[str, Any]] = None
    note: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str
