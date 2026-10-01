"""Configuration loading for ML and shared modules."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

from ml.paths import PROJECT_ROOT, resolve_path


def _load_dotenv() -> None:
    env_file = PROJECT_ROOT / ".env"
    example = PROJECT_ROOT / ".env.example"
    if env_file.exists():
        load_dotenv(env_file)
    elif example.exists():
        load_dotenv(example)


@lru_cache(maxsize=1)
def load_config(config_path: str | None = None) -> dict[str, Any]:
    """Load YAML config and overlay environment variables."""
    _load_dotenv()
    path = resolve_path(config_path or "configs/default.yaml")
    with open(path, encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}

    # Environment overlays
    if os.getenv("DATASET_ROOT"):
        cfg.setdefault("dataset", {})["root"] = os.getenv("DATASET_ROOT")
    else:
        cfg.setdefault("dataset", {})["root"] = cfg["dataset"].get(
            "default_root", "./data/CarDD"
        )

    for env_key, cfg_keys, cast in [
        ("IMAGE_SIZE", ("preprocessing", "image_size"), int),
        ("BATCH_SIZE", ("training", "batch_size"), int),
        ("EPOCHS", ("training", "epochs"), int),
        ("LEARNING_RATE", ("training", "learning_rate"), float),
        ("SEED", ("split", "seed"), int),
        ("TRAIN_RATIO", ("split", "train_ratio"), float),
        ("VAL_RATIO", ("split", "val_ratio"), float),
        ("TEST_RATIO", ("split", "test_ratio"), float),
        ("ARTIFACTS_DIR", ("paths", "artifacts_dir"), str),
        ("MODELS_DIR", ("paths", "models_dir"), str),
        ("EVALUATION_DIR", ("paths", "evaluation_dir"), str),
        ("SPLITS_DIR", ("paths", "splits_dir"), str),
        ("HISTORY_DIR", ("paths", "history_dir"), str),
        ("CHECKPOINTS_DIR", ("paths", "checkpoints_dir"), str),
    ]:
        val = os.getenv(env_key)
        if val is None:
            continue
        section, key = cfg_keys
        cfg.setdefault(section, {})[key] = cast(val)

    return cfg


def get_class_names(cfg: dict[str, Any] | None = None) -> list[str]:
    cfg = cfg or load_config()
    return list(cfg["dataset"]["classes"])


def get_num_classes(cfg: dict[str, Any] | None = None) -> int:
    return len(get_class_names(cfg))


def get_dataset_root(cfg: dict[str, Any] | None = None) -> Path:
    cfg = cfg or load_config()
    return resolve_path(cfg["dataset"]["root"])


def get_artifacts_paths(cfg: dict[str, Any] | None = None) -> dict[str, Path]:
    cfg = cfg or load_config()
    paths = cfg["paths"]
    return {
        "artifacts": resolve_path(paths["artifacts_dir"]),
        "models": resolve_path(paths["models_dir"]),
        "evaluation": resolve_path(paths["evaluation_dir"]),
        "splits": resolve_path(paths["splits_dir"]),
        "history": resolve_path(paths["history_dir"]),
        "checkpoints": resolve_path(paths["checkpoints_dir"]),
        "metrics": resolve_path(paths["metrics_file"]),
        "comparison": resolve_path(paths["comparison_file"]),
    }
