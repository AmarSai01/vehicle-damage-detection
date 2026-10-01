"""Application settings loaded from environment / .env."""

from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root = parents[2] from backend/app/core/config.py → backend/app/core → backend/app → backend → root
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:5176,http://127.0.0.1:5176"
    
    max_upload_size_mb: int = 10
    allowed_image_extensions: str = ".jpg,.jpeg,.png,.bmp,.webp"
    models_dir: str = "./ml/artifacts/models"
    evaluation_dir: str = "./ml/artifacts/evaluation"
    project_name: str = "Vehicle Damage Detection API"
    project_version: str = "1.0.0"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_ext_set(self) -> set[str]:
        return {
            e.strip().lower() if e.strip().startswith(".") else f".{e.strip().lower()}"
            for e in self.allowed_image_extensions.split(",")
            if e.strip()
        }

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def root(self) -> Path:
        return PROJECT_ROOT


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
