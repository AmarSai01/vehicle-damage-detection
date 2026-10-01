#!/usr/bin/env python
"""Prepare train/val/test indexes from CarDD (does not modify CarDD files)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.config import get_artifacts_paths, get_class_names, get_dataset_root, load_config
from ml.paths import ensure_dir
from ml.preprocessing.dataset_loader import (
    LABEL_STRATEGY,
    detect_layout,
    load_cardd_coco_splits,
    load_samples,
)
from ml.preprocessing.split_dataset import official_coco_split, save_split, stratified_split


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare CarDD split indexes (official COCO splits preferred)"
    )
    parser.add_argument("--dataset-root", type=str, default=None)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--train-ratio", type=float, default=None)
    parser.add_argument("--val-ratio", type=float, default=None)
    parser.add_argument("--test-ratio", type=float, default=None)
    parser.add_argument(
        "--force-stratified",
        action="store_true",
        help="Ignore official CarDD_COCO splits and create a new stratified split "
        "(not recommended when official splits exist).",
    )
    args = parser.parse_args()

    cfg = load_config()
    root = Path(args.dataset_root) if args.dataset_root else get_dataset_root(cfg)
    class_names = get_class_names(cfg)
    layout = detect_layout(root)
    print(f"Dataset root: {root}")
    print(f"Detected layout: {layout}")

    artifacts = get_artifacts_paths(cfg)
    report_dir = ensure_dir(artifacts["artifacts"] / "dataset_reports")

    if layout == "cardd_coco" and not args.force_stratified:
        by_split, unrecognized, missing, meta = load_cardd_coco_splits(root, class_names)
        train, val, test = by_split["train"], by_split["val"], by_split["test"]
        print(
            json.dumps(
                {
                    "layout": layout,
                    "label_strategy": meta.get("label_strategy"),
                    "split_counts": {k: len(v) for k, v in by_split.items()},
                    "unrecognized_labels": sorted(set(unrecognized)),
                    "missing_count": len(missing),
                    "missing_sample": missing[:10],
                    "coco_meta": meta.get("splits"),
                },
                indent=2,
            )
        )
        if not train or not val or not test:
            print("Official split loading failed (empty split).")
            sys.exit(1)

        split = official_coco_split(
            train,
            val,
            test,
            class_names=class_names,
            label_strategy=meta.get("label_strategy", LABEL_STRATEGY),
        )
        # Save derived classification index summary outside CarDD
        summary_path = report_dir / "cardd_coco_classification_index_summary.json"
        summary = {
            "dataset_root": str(root.resolve()),
            "layout": layout,
            "label_strategy": split.label_strategy,
            "source": split.source,
            "counts": {
                "train": len(train),
                "val": len(val),
                "test": len(test),
            },
            "class_distribution": split.class_distribution,
            "notes": [
                "Official CarDD train/val/test partitions preserved.",
                "Image-level labels derived via max total COCO area per category.",
                "Original CarDD files were not modified.",
            ],
        }
        summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"Wrote classification summary -> {summary_path}")
    else:
        samples, report = load_samples(root, cfg)
        print(json.dumps(report.to_dict(), indent=2))
        if report.valid_samples == 0:
            print("\nNo labeled samples found. Obtain CarDD legally and set DATASET_ROOT.")
            sys.exit(1)

        seed = args.seed if args.seed is not None else cfg["split"]["seed"]
        train_ratio = (
            args.train_ratio if args.train_ratio is not None else cfg["split"]["train_ratio"]
        )
        val_ratio = args.val_ratio if args.val_ratio is not None else cfg["split"]["val_ratio"]
        test_ratio = (
            args.test_ratio if args.test_ratio is not None else cfg["split"]["test_ratio"]
        )
        split = stratified_split(
            samples,
            train_ratio=train_ratio,
            val_ratio=val_ratio,
            test_ratio=test_ratio,
            seed=seed,
            class_names=class_names,
        )

    out = save_split(split)
    print(f"\nSaved split indexes -> {out}")
    print(f"Split source: {split.source}")
    print("Class distribution:", json.dumps(split.class_distribution, indent=2))
    print("Original CarDD files were not modified.")


if __name__ == "__main__":
    main()
