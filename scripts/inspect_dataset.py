#!/usr/bin/env python
"""Inspect CarDD dataset structure and class distribution without modifying files."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.config import get_dataset_root, load_config
from ml.preprocessing.dataset_loader import (
    detect_layout,
    enrich_report_with_corrupt_check,
    load_samples,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect CarDD dataset")
    parser.add_argument(
        "--dataset-root",
        type=str,
        default=None,
        help="Override DATASET_ROOT / config dataset path",
    )
    parser.add_argument(
        "--check-corrupt",
        action="store_true",
        help="Attempt to open each image (slower)",
    )
    parser.add_argument(
        "--corrupt-limit",
        type=int,
        default=None,
        help="Limit number of images checked for corruption",
    )
    parser.add_argument(
        "--json-out",
        type=str,
        default=None,
        help="Optional path to write JSON report",
    )
    args = parser.parse_args()

    cfg = load_config()
    root = Path(args.dataset_root) if args.dataset_root else get_dataset_root(cfg)
    print("=" * 60)
    print("CarDD Dataset Inspection")
    print("=" * 60)
    print(f"Dataset root : {root}")
    print(f"Exists       : {root.exists()}")
    print(f"Detected layout: {detect_layout(root)}")
    print()
    print("Licensing reminder:")
    print("  CarDD requires prior consent from the PIC Lab.")
    print("  Official site: https://cardd-ustc.github.io/")
    print("  Do not redistribute the dataset or commit it to Git.")
    print()

    samples, report = load_samples(root, cfg)
    if args.check_corrupt and samples:
        report = enrich_report_with_corrupt_check(samples, report, limit=args.corrupt_limit)

    print(f"Layout            : {report.layout}")
    print(f"Label strategy    : {report.label_strategy}")
    print(f"Total image files : {report.total_images}")
    print(f"Valid labeled     : {report.valid_samples}")
    if report.split_counts:
        print("Official split sample counts:")
        for split_name, count in report.split_counts.items():
            print(f"  {split_name:10s} {count}")
    print("Class distribution (image-level labels):")
    for cls, count in report.class_counts.items():
        print(f"  {cls:20s} {count}")
    if report.unrecognized_labels:
        print("Unrecognized labels:", report.unrecognized_labels)
    if report.missing_or_corrupt:
        print(f"Missing/corrupt (showing up to 20): {report.missing_or_corrupt[:20]}")
    for note in report.notes:
        print(f"Note: {note}")

    # Always write a derived report outside the dataset tree
    default_out = ROOT / "ml" / "artifacts" / "dataset_reports" / "inspect_dataset_report.json"
    out = Path(args.json_out) if args.json_out else default_out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report.to_dict(), indent=2), encoding="utf-8")
    print(f"\nWrote report -> {out}")

    if report.layout == "missing" or report.valid_samples == 0:
        print("\n*** Dataset not ready for training. ***")
        print("Manual action required:")
        print("  1. Visit https://cardd-ustc.github.io/")
        print("  2. Complete the CarDD license/consent form and email the PIC Lab contact.")
        print("  3. Download the authorized dataset after approval.")
        print("  4. Extract it and set DATASET_ROOT in .env to the CarDD_COCO folder.")
        print("  5. Re-run: python scripts/inspect_dataset.py")
        sys.exit(1)

    print("\nDataset looks usable. Next: python scripts/prepare_dataset.py")
    print("Do not modify original CarDD files. Training is a separate step.")


if __name__ == "__main__":
    main()
