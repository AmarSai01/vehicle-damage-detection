"""
FastAPI entrypoint for Vehicle Damage Detection.

Run from project root:
  uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

Or from backend/:
  set PYTHONPATH=<project_root>
  uvicorn app.main:app --reload
"""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is importable
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.api.routes import router
from backend.app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    version=settings.project_version,
    description=(
        "Vehicle Damage Detection & Classification API. "
        "Runs inference with Custom CNN and MobileNetV2. "
        "Returns model-not-available errors instead of fake predictions."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Local Vite may bind 5173, 5174, ... — accept any localhost/127.0.0.1 port
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": settings.project_name,
        "version": settings.project_version,
        "docs": "/docs",
        "health": "/api/health",
    }
