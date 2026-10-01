"""Reproducible stratified train/validation/test splitting."""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.model_selection import train_test_split

from ml.config import get_artifacts_paths, get_class_names, load_config
from ml.paths import ensure_dir
from ml.preprocessing.dataset_loader import Sample


@dataclass
class SplitResult:
    train: list[Sample]
    val: list[Sample]
    test: list[Sample]
    seed: int
    ratios: dict[str, float]
    class_distribution: dict[str, dict[str, int]]
    source: str = "stratified"
    label_strategy: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "seed": self.seed,
            "ratios": self.ratios,
            "source": self.source,
            "label_strategy": self.label_strategy,
            "class_distribution": self.class_distribution,
            "counts": {
                "train": len(self.train),
                "val": len(self.val),
                "test": len(self.test),
            },
            "train": [s.to_dict() for s in self.train],
            "val": [s.to_dict() for s in self.val],
            "test": [s.to_dict() for s in self.test],
        }


def _distribution(samples: list[Sample], class_names: list[str]) -> dict[str, int]:
    counts = Counter(s.label for s in samples)
    return {c: int(counts.get(c, 0)) for c in class_names}


def stratified_split(
    samples: list[Sample],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
    class_names: list[str] | None = None,
) -> SplitResult:
    """
    Create a stratified train/val/test split.

    Prevents leakage by assigning each image path to exactly one split.
    """
    if not samples:
        raise ValueError("No samples to split. Ensure the authorized dataset is available.")

    total = train_ratio + val_ratio + test_ratio
    if abs(total - 1.0) > 1e-6:
        raise ValueError(f"Split ratios must sum to 1.0, got {total}")

    class_names = class_names or get_class_names()
    labels = [s.label for s in samples]
    label_counts = Counter(labels)
    # Stratify requires >= 2 samples per class for the first split
    for cls, n in label_counts.items():
        if n < 3:
            raise ValueError(
                f"Class '{cls}' has only {n} sample(s); need at least 3 for stratified split."
            )

    indices = np.arange(len(samples))
    y = np.array(labels)

    train_idx, temp_idx, _, temp_y = train_test_split(
        indices,
        y,
        test_size=(1.0 - train_ratio),
        random_state=seed,
        stratify=y,
    )

    relative_test = test_ratio / (val_ratio + test_ratio)
    val_idx, test_idx = train_test_split(
        temp_idx,
        test_size=relative_test,
        random_state=seed,
        stratify=temp_y,
    )

    train = [samples[i] for i in train_idx]
    val = [samples[i] for i in val_idx]
    test = [samples[i] for i in test_idx]

    # Sanity: no path overlap
    sets = [
        {s.image_path for s in train},
        {s.image_path for s in val},
        {s.image_path for s in test},
    ]
    if sets[0] & sets[1] or sets[0] & sets[2] or sets[1] & sets[2]:
        raise RuntimeError("Data leakage detected: overlapping paths across splits.")

    return SplitResult(
        train=train,
        val=val,
        test=test,
        seed=seed,
        ratios={"train": train_ratio, "val": val_ratio, "test": test_ratio},
        class_distribution={
            "train": _distribution(train, class_names),
            "val": _distribution(val, class_names),
            "test": _distribution(test, class_names),
            "all": _distribution(samples, class_names),
        },
        source="stratified",
    )


def official_coco_split(
    train: list[Sample],
    val: list[Sample],
    test: list[Sample],
    class_names: list[str] | None = None,
    label_strategy: str | None = None,
) -> SplitResult:
    """
    Build a SplitResult from CarDD's published train/val/test partitions.

    Does not reshuffle or re-split. Checks for path leakage across splits.
    """
    if not train or not val or not test:
        raise ValueError("Official COCO split requires non-empty train, val, and test lists.")

    class_names = class_names or get_class_names()
    sets = [
        {s.image_path for s in train},
        {s.image_path for s in val},
        {s.image_path for s in test},
    ]
    if sets[0] & sets[1] or sets[0] & sets[2] or sets[1] & sets[2]:
        raise RuntimeError("Data leakage detected: overlapping paths across official splits.")

    total = len(train) + len(val) + len(test)
    ratios = {
        "train": round(len(train) / total, 6),
        "val": round(len(val) / total, 6),
        "test": round(len(test) / total, 6),
    }
    all_samples = [*train, *val, *test]
    return SplitResult(
        train=train,
        val=val,
        test=test,
        seed=-1,
        ratios=ratios,
        class_distribution={
            "train": _distribution(train, class_names),
            "val": _distribution(val, class_names),
            "test": _distribution(test, class_names),
            "all": _distribution(all_samples, class_names),
        },
        source="cardd_coco_official",
        label_strategy=label_strategy,
    )


def save_split(split: SplitResult, output_dir: Path | None = None) -> Path:
    cfg = load_config()
    paths = get_artifacts_paths(cfg)
    out = ensure_dir(output_dir or paths["splits"])
    split_path = out / "split.json"
    meta_path = out / "split_meta.json"

    payload = split.to_dict()
    with open(split_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    meta = {
        "seed": split.seed,
        "ratios": split.ratios,
        "source": split.source,
        "label_strategy": split.label_strategy,
        "counts": payload["counts"],
        "class_distribution": split.class_distribution,
        "note": (
            "Original CarDD files were not modified. This split indexes paths only "
            "and is stored under ml/artifacts/splits/."
        ),
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    return split_path


def load_split(split_path: Path | None = None) -> SplitResult:
    cfg = load_config()
    paths = get_artifacts_paths(cfg)
    path = split_path or (paths["splits"] / "split.json")
    if not path.exists():
        raise FileNotFoundError(
            f"Split file not found: {path}. Run scripts/prepare_dataset.py first."
        )
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    def to_samples(items: list[dict]) -> list[Sample]:
        return [Sample(**item) for item in items]

    return SplitResult(
        train=to_samples(data["train"]),
        val=to_samples(data["val"]),
        test=to_samples(data["test"]),
        seed=data["seed"],
        ratios=data["ratios"],
        class_distribution=data["class_distribution"],
        source=data.get("source", "stratified"),
        label_strategy=data.get("label_strategy"),
    )
