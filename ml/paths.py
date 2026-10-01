"""Shared path helpers and project-root resolution."""

from __future__ import annotations

import os
from pathlib import Path


def find_project_root(start: Path | None = None) -> Path:
    """Walk upward until configs/default.yaml is found."""
    current = (start or Path.cwd()).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "configs" / "default.yaml").exists():
            return candidate
    return current


PROJECT_ROOT = find_project_root()


def resolve_path(path: str | Path, base: Path | None = None) -> Path:
    """Resolve relative paths against the project root."""
    p = Path(path)
    if p.is_absolute():
        return p
    return (base or PROJECT_ROOT) / p


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def env_path(key: str, default: str) -> Path:
    return resolve_path(os.getenv(key, default))
