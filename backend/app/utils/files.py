"""Upload validation utilities."""

from __future__ import annotations

import re
from pathlib import Path

from fastapi import HTTPException, UploadFile

SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(name: str) -> str:
    base = Path(name).name
    cleaned = SAFE_NAME_RE.sub("_", base).strip("._")
    return cleaned or "upload.bin"


def validate_upload(
    file: UploadFile,
    data: bytes,
    allowed_exts: set[str],
    max_bytes: int,
) -> str:
    """Validate uploaded image; return sanitized filename or raise HTTPException."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")

    filename = sanitize_filename(file.filename)
    ext = Path(filename).suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported format '{ext}'. Allowed: {sorted(allowed_exts)}",
        )

    if not data:
        raise HTTPException(status_code=400, detail="Empty file upload.")

    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(data)} bytes). Max allowed: {max_bytes} bytes.",
        )

    # Content-type hint (not authoritative)
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=415,
            detail=f"Invalid content type '{file.content_type}'. Expected an image.",
        )

    return filename
