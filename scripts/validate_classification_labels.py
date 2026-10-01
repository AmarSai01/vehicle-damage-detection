"""
Final classification-label validation for CarDD_COCO.

Read-only on original CarDD files. Compares:
  - official COCO annotations
  - derived classification indexes in ml/artifacts/splits/split.json

Does not train models or invent metrics.
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.config import get_artifacts_paths, get_class_names, get_dataset_root, load_config
from ml.paths import ensure_dir
from ml.preprocessing.dataset_loader import (
    CARDD_COCO_SPLITS,
    LABEL_STRATEGY,
    choose_primary_category,
    normalize_label,
)
from ml.preprocessing.split_dataset import load_split


def _load_coco_split(root: Path, split: str) -> dict:
    json_name, img_dir = CARDD_COCO_SPLITS[split]
    with open(root / "annotations" / json_name, encoding="utf-8") as f:
        data = json.load(f)
    return {
        "data": data,
        "img_dir": root / img_dir,
        "ann_path": root / "annotations" / json_name,
    }


def validate() -> dict:
    cfg = load_config()
    root = get_dataset_root(cfg)
    class_names = get_class_names(cfg)
    split = load_split()

    errors: list[str] = []
    warnings: list[str] = []

    # --- 1 & 7: every sample has exactly one label; official split fields ---
    by_split = {"train": split.train, "val": split.val, "test": split.test}
    for name, samples in by_split.items():
        for s in samples:
            if not s.label:
                errors.append(f"{name}: empty label for {s.image_path}")
            if s.label not in class_names:
                errors.append(f"{name}: unknown label '{s.label}' for {s.image_path}")
            if s.split and s.split != name:
                errors.append(
                    f"{name}: sample.split={s.split!r} mismatches official bucket for {s.image_path}"
                )
            if s.source and not s.source.startswith("cardd_coco:"):
                warnings.append(f"{name}: unexpected source {s.source!r}")

    # Exactly one assigned target class per image path within each split list
    for name, samples in by_split.items():
        labels_per_path: dict[str, set[str]] = defaultdict(set)
        for s in samples:
            labels_per_path[s.image_path].add(s.label)
        for path, labs in labels_per_path.items():
            if len(labs) != 1:
                errors.append(f"{name}: path has multiple assigned labels {labs}: {path}")

    # --- 8: leakage ---
    train_p = {s.image_path for s in split.train}
    val_p = {s.image_path for s in split.val}
    test_p = {s.image_path for s in split.test}
    leakage = {
        "train∩val": sorted(train_p & val_p),
        "train∩test": sorted(train_p & test_p),
        "val∩test": sorted(val_p & test_p),
    }
    leakage_detected = any(leakage.values())
    if leakage_detected:
        errors.append(f"Image path leakage detected: {[k for k,v in leakage.items() if v]}")

    # Also check basename collision across splits (same filename in different folders is OK
    # if full paths differ; flag identical resolved paths only — already done.)
    # Check COCO image ids overlap across splits
    id_sets = {}
    multi_class_stats = {}
    single_class_stats = {}
    coco_image_counts = {}
    missing_files = []
    policy_mismatches = []
    multi_class_examples = []

    for name in ("train", "val", "test"):
        bundle = _load_coco_split(root, name)
        data = bundle["data"]
        img_dir = bundle["img_dir"]
        images = {int(im["id"]): im for im in data["images"]}
        anns_by_image: dict[int, list[dict]] = defaultdict(list)
        for ann in data["annotations"]:
            anns_by_image[int(ann["image_id"])].append(ann)

        id_sets[name] = set(images.keys())
        coco_image_counts[name] = len(images)

        single = 0
        multi = 0
        for iid, anns in anns_by_image.items():
            cats = {int(a["category_id"]) for a in anns}
            if len(cats) > 1:
                multi += 1
                if len(multi_class_examples) < 15:
                    im = images[iid]
                    multi_class_examples.append(
                        {
                            "split": name,
                            "coco_image_id": iid,
                            "file_name": im["file_name"],
                            "category_ids": sorted(cats),
                            "num_annotations": len(anns),
                        }
                    )
            else:
                single += 1
        # images with annotations only — all verified previously have anns
        images_without_ann = [iid for iid in images if iid not in anns_by_image]
        single_class_stats[name] = single
        multi_class_stats[name] = multi
        if images_without_ann:
            warnings.append(f"{name}: {len(images_without_ann)} images with zero annotations")

        # Map path -> sample for this split
        samples_by_path = {s.image_path: s for s in by_split[name]}
        samples_by_id = {s.coco_image_id: s for s in by_split[name] if s.coco_image_id is not None}

        if len(samples_by_path) != len(by_split[name]):
            errors.append(f"{name}: duplicate image_path entries in classification index")

        # Every COCO image must appear exactly once in classification index
        if len(by_split[name]) != len(images):
            errors.append(
                f"{name}: classification samples ({len(by_split[name])}) != COCO images ({len(images)})"
            )

        for iid, im in images.items():
            file_name = im["file_name"]
            path = img_dir / file_name
            if not path.exists():
                path = img_dir / Path(file_name).name
            if not path.exists():
                missing_files.append(f"{name}/{file_name}")
                continue
            resolved = str(path.resolve())
            sample = samples_by_path.get(resolved) or samples_by_id.get(iid)
            if sample is None:
                errors.append(f"{name}: COCO image {iid} ({file_name}) missing from classification index")
                continue

            # Recompute policy label from original annotations
            chosen = choose_primary_category(anns_by_image[iid])
            if chosen is None:
                errors.append(f"{name}: no annotations for image {iid}")
                continue
            best_cid, total_area, _ = chosen
            cats_raw = {int(c["id"]): c["name"] for c in data["categories"]}
            expected = normalize_label(cats_raw[best_cid], class_names)
            if sample.label != expected:
                policy_mismatches.append(
                    {
                        "split": name,
                        "file": file_name,
                        "assigned": sample.label,
                        "expected_by_policy": expected,
                        "total_area": total_area,
                    }
                )

            # File existence for indexed path
            if not Path(sample.image_path).exists():
                missing_files.append(sample.image_path)

    # COCO image id leakage across splits
    id_leakage = {
        "train∩val": sorted(id_sets["train"] & id_sets["val"]),
        "train∩test": sorted(id_sets["train"] & id_sets["test"]),
        "val∩test": sorted(id_sets["val"] & id_sets["test"]),
    }
    # Note: CarDD may reuse numeric ids across split JSON files; path leakage is the critical check.
    # Report id overlap as informational.
    id_overlap_info = {k: len(v) for k, v in id_leakage.items()}

    if policy_mismatches:
        errors.append(f"{len(policy_mismatches)} policy mismatches between index and recomputed labels")

    # --- 9: class counts ---
    def counts(samples):
        c = Counter(s.label for s in samples)
        return {name: int(c.get(name, 0)) for name in class_names}

    class_counts = {
        "train": counts(split.train),
        "val": counts(split.val),
        "test": counts(split.test),
        "all": counts([*split.train, *split.val, *split.test]),
    }

    # Each sample has exactly one label — already checked; summarize
    samples_with_one_label = all(
        bool(s.label) and s.label in class_names
        for s in [*split.train, *split.val, *split.test]
    )

    # Multi-class images are retained (not discarded): index size == COCO image count
    retained = {
        name: len(by_split[name]) == coco_image_counts[name]
        for name in ("train", "val", "test")
    }

    safe_to_train = (
        not errors
        and not leakage_detected
        and not missing_files
        and samples_with_one_label
        and all(retained.values())
        and split.source == "cardd_coco_official"
    )

    report = {
        "dataset_root": str(root.resolve()),
        "split_source": split.source,
        "label_strategy": split.label_strategy or LABEL_STRATEGY,
        "safe_to_train": safe_to_train,
        "errors": errors,
        "warnings": warnings,
        "checks": {
            "every_image_exactly_one_target_class": samples_with_one_label and not any(
                "multiple assigned labels" in e for e in errors
            ),
            "multi_class_images_not_discarded": all(retained.values()),
            "official_splits_preserved": split.source == "cardd_coco_official",
            "path_leakage_detected": leakage_detected,
            "missing_image_files": len(missing_files),
            "policy_mismatches": len(policy_mismatches),
        },
        "coco_image_counts": coco_image_counts,
        "classification_sample_counts": {k: len(v) for k, v in by_split.items()},
        "single_class_images": single_class_stats,
        "multi_class_images": multi_class_stats,
        "multi_class_examples": multi_class_examples,
        "class_counts_after_conversion": class_counts,
        "path_leakage": {k: len(v) for k, v in leakage.items()},
        "coco_image_id_overlap_counts": id_overlap_info,
        "coco_image_id_overlap_note": (
            "Numeric image ids may repeat across split JSON files; "
            "leakage is assessed on resolved filesystem paths."
        ),
        "missing_files_sample": missing_files[:20],
        "policy_mismatch_sample": policy_mismatches[:10],
        "policy": {
            "name": LABEL_STRATEGY,
            "description": (
                "For each image, sum COCO annotation `area` per category_id; "
                "assign the category with maximum total area. "
                "Ties: higher annotation count, then lower category_id. "
                "Multi-class images are retained with this single deterministic label."
            ),
            "ambiguity_assessment": (
                "Material for interpretation (multi-damage scenes reduced to one class) "
                "but deterministic and documented; experiment remains valid if this policy "
                "is stated in methods. No silent discard."
            ),
            "ask_user": False,
        },
        "next_train_command": (
            r'.\.venv\Scripts\python.exe -m ml.training.train_custom_cnn'
        ),
    }
    return report


def main() -> int:
    report = validate()
    out_dir = ensure_dir(get_artifacts_paths()["artifacts"] / "dataset_reports")
    out_path = out_dir / "classification_label_validation.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote validation report -> {out_path}")
    if report["safe_to_train"]:
        print("\nRESULT: Classification dataset is SAFE TO TRAIN under the documented policy.")
        return 0
    print("\nRESULT: Validation FAILED — see errors above.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
