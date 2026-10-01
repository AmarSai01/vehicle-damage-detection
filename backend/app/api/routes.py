"""API routes."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile

from backend.app.core.config import get_settings
from backend.app.schemas.prediction import (
    ComparisonResponse,
    HealthResponse,
    ModelsResponse,
    PredictResponse,
)
from backend.app.services.prediction_service import (
    get_models_info,
    load_comparison,
    run_prediction,
)
from backend.app.services.visualization_service import build_visualizations_payload
from backend.app.utils.files import validate_upload
from ml.inference.predictor import get_predictor

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    predictor = get_predictor()
    return HealthResponse(
        status="ok",
        version=settings.project_version,
        models=predictor.status(expose_paths=False),
    )


@router.get("/models", response_model=ModelsResponse)
async def models() -> ModelsResponse:
    info = get_models_info()
    return ModelsResponse(**info)


@router.get("/comparison", response_model=ComparisonResponse)
async def comparison() -> ComparisonResponse:
    data = load_comparison()
    return ComparisonResponse(
        status=data.get("status", "unknown"),
        message=data.get("message"),
        models=data.get("models", {}),
        table=data.get("table"),
        note=data.get("note"),
    )


@router.get("/visualizations")
async def visualizations() -> dict:
    """
    Chart-ready evaluation/history payload assembled from existing artifacts.
    Does not retrain or re-run inference.
    """
    return build_visualizations_payload()


@router.post("/predict", response_model=PredictResponse)
async def predict(
    file: UploadFile = File(...),
    model: str = Form("both"),
) -> PredictResponse:
    """
    Run inference on an uploaded image.

    Form fields:
      - file: image upload
      - model: custom_cnn | mobilenetv2 | both (default both)
    """
    settings = get_settings()
    data = await file.read()
    validate_upload(
        file,
        data,
        allowed_exts=settings.allowed_ext_set,
        max_bytes=settings.max_upload_bytes,
    )
    result = run_prediction(data, model=model.strip().lower())
    return PredictResponse(**result)
