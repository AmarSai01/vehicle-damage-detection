#!/usr/bin/env python3
"""Download trained Keras model artifacts for deployment (stdlib only).

Intended for Vercel buildCommand. Does not change inference or training code.
Skips a file when the target path already exists.
"""

from __future__ import annotations

import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = PROJECT_ROOT / "ml" / "artifacts" / "models"

MODELS = {
    "custom_cnn.keras": (
        "https://huggingface.co/Amarsai01/vehicle-damage-detection-models/"
        "resolve/main/custom_cnn.keras"
    ),
    "mobilenetv2.keras": (
        "https://huggingface.co/Amarsai01/vehicle-damage-detection-models/"
        "resolve/main/mobilenetv2.keras"
    ),
}


def download_file(url: str, dest: Path) -> None:
    """Download url to dest, writing via a temporary sibling file."""
    tmp = dest.with_suffix(dest.suffix + ".partial")
    try:
        print(f"Downloading {dest.name} …")
        urllib.request.urlretrieve(url, tmp)
        tmp.replace(dest)
        size_mb = dest.stat().st_size / (1024 * 1024)
        print(f"  Saved {dest} ({size_mb:.1f} MB)")
    except (urllib.error.URLError, OSError) as exc:
        if tmp.exists():
            tmp.unlink(missing_ok=True)
        raise SystemExit(f"ERROR: failed to download {dest.name} from {url}\n  {exc}") from exc


def main() -> int:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Model directory: {MODELS_DIR}")

    for filename, url in MODELS.items():
        dest = MODELS_DIR / filename
        if dest.is_file() and dest.stat().st_size > 0:
            print(f"Skipping {filename} (already exists)")
            continue
        download_file(url, dest)

    print("Model download complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
