"""Inspect CarDD_COCO annotations. Read-only — never modifies dataset files."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Amar Sai\Download\CarDD_release\CarDD_release\CarDD_COCO")
OUT = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "dataset_reports" / "cardd_coco_inspection.json"

SPLITS = {
    "train": ("instances_train2017.json", "train2017"),
    "val": ("instances_val2017.json", "val2017"),
    "test": ("instances_test2017.json", "test2017"),
}


def inspect_split(split: str, ann_name: str, img_dir: str) -> dict:
    path = ROOT / "annotations" / ann_name
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    cats = data.get("categories", [])
    images = data.get("images", [])
    anns = data.get("annotations", [])
    cat_by_id = {c["id"]: c for c in cats}

    cat_list = [
        {"id": c["id"], "name": c.get("name"), "supercategory": c.get("supercategory")}
        for c in sorted(cats, key=lambda x: x["id"])
    ]

    anns_per_image: Counter = Counter()
    cats_per_image: dict[int, set] = defaultdict(set)
    ann_cat_counts: Counter = Counter()
    cat_counts_by_image: dict[int, Counter] = defaultdict(Counter)

    for a in anns:
        iid = a["image_id"]
        cid = a["category_id"]
        anns_per_image[iid] += 1
        cats_per_image[iid].add(cid)
        ann_cat_counts[cid] += 1
        cat_counts_by_image[iid][cid] += 1

    multi_class_images = sum(1 for s in cats_per_image.values() if len(s) > 1)
    multi_ann_images = sum(1 for n in anns_per_image.values() if n > 1)
    imgs_with_ann = set(anns_per_image.keys())
    imgs_no_ann = [im["id"] for im in images if im["id"] not in imgs_with_ann]

    img_root = ROOT / img_dir
    missing_files = []
    exist_count = 0
    for im in images:
        fp = img_root / im["file_name"]
        if not fp.exists():
            fp = img_root / Path(im["file_name"]).name
        if fp.exists():
            exist_count += 1
        else:
            missing_files.append(im["file_name"])

    images_per_cat: Counter = Counter()
    for cats_set in cats_per_image.values():
        for cid in cats_set:
            images_per_cat[cid] += 1

    majority: Counter = Counter()
    ties = 0
    for ccount in cat_counts_by_image.values():
        top = ccount.most_common()
        if len(top) > 1 and top[0][1] == top[1][1]:
            ties += 1
            best = min(cid for cid, n in top if n == top[0][1])
        else:
            best = top[0][0]
        majority[best] += 1

    sample_ann = None
    if anns:
        sample_ann = {k: anns[0][k] for k in anns[0] if k != "segmentation"}
        seg = anns[0].get("segmentation")
        sample_ann["segmentation_type"] = type(seg).__name__

    return {
        "ann_file": str(path),
        "top_level_keys": sorted(data.keys()),
        "info": data.get("info", {}),
        "categories": cat_list,
        "num_categories": len(cats),
        "num_images_in_json": len(images),
        "num_annotations": len(anns),
        "num_image_files_on_disk": sum(1 for x in img_root.iterdir() if x.is_file()),
        "images_with_existing_files": exist_count,
        "missing_files_count": len(missing_files),
        "missing_files_sample": missing_files[:10],
        "images_with_zero_annotations": len(imgs_no_ann),
        "images_with_annotations": len(imgs_with_ann),
        "multi_annotation_images": multi_ann_images,
        "multi_class_images": multi_class_images,
        "annotation_category_counts": {
            cat_by_id[cid]["name"]: int(n) for cid, n in sorted(ann_cat_counts.items())
        },
        "images_per_category": {
            cat_by_id[cid]["name"]: int(n) for cid, n in sorted(images_per_cat.items())
        },
        "majority_vote_image_labels": {
            cat_by_id[cid]["name"]: int(n) for cid, n in sorted(majority.items())
        },
        "majority_ties": ties,
        "sample_image_keys": sorted(images[0].keys()) if images else [],
        "sample_annotation_keys": sorted(k for k in anns[0].keys()) if anns else [],
        "sample_image": images[0] if images else None,
        "sample_annotation": sample_ann,
        "sample_file_name": images[0]["file_name"] if images else None,
        "ann_count_histogram": {
            str(k): int(v) for k, v in sorted(Counter(anns_per_image.values()).items())
        },
        "distinct_classes_per_image_histogram": {
            str(k): int(v)
            for k, v in sorted(Counter(len(s) for s in cats_per_image.values()).items())
        },
    }


def main() -> None:
    reports = {}
    for split, (ann_name, img_dir) in SPLITS.items():
        print(f"Inspecting {split}...")
        reports[split] = inspect_split(split, ann_name, img_dir)

    def sig(r: dict) -> dict:
        return {
            "keys": r["top_level_keys"],
            "num_categories": r["num_categories"],
            "categories": r["categories"],
            "image_keys": r["sample_image_keys"],
            "ann_keys": r["sample_annotation_keys"],
        }

    payload = {
        "dataset_root": str(ROOT),
        "structures_identical_across_splits": sig(reports["train"])
        == sig(reports["val"])
        == sig(reports["test"]),
        "structure_signatures": {s: sig(reports[s]) for s in reports},
        "splits": reports,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(f"\nWrote report -> {OUT}")


if __name__ == "__main__":
    main()
