"""
CarDD dataset ingestion and inspection.

Verified CarDD_COCO categories (from instances_*.json — do not invent names):
  1 dent
  2 scratch
  3 crack
  4 glass shatter
  5 lamp broken
  6 tire flat

Primary layout (actual release):
  CarDD_COCO/
    annotations/instances_{train,val,test}2017.json
    train2017/  val2017/  test2017/

Original dataset files are never modified or deleted.
Derived indexes/metadata are written only under ml/artifacts/.
"""

from __future__ import annotations

import csv
import json
import logging
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterable

from ml.config import get_class_names, get_dataset_root, load_config

logger = logging.getLogger(__name__)

# Exact CarDD_COCO category names → internal snake_case ids
CLASS_ALIASES: dict[str, str] = {
    "dent": "dent",
    "scratch": "scratch",
    "crack": "crack",
    "glass shatter": "glass_shatter",
    "glass_shatter": "glass_shatter",
    "glassshatter": "glass_shatter",
    "lamp broken": "lamp_broken",
    "lamp_broken": "lamp_broken",
    "lampbroken": "lamp_broken",
    "broken lamp": "lamp_broken",
    "broken_lamp": "lamp_broken",
    "tire flat": "tire_flat",
    "tire_flat": "tire_flat",
    "tireflat": "tire_flat",
    "flat tire": "tire_flat",
    "flat_tire": "tire_flat",
}

# Official CarDD_COCO split file mapping
CARDD_COCO_SPLITS: dict[str, tuple[str, str]] = {
    "train": ("instances_train2017.json", "train2017"),
    "val": ("instances_val2017.json", "val2017"),
    "test": ("instances_test2017.json", "test2017"),
}

SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

# Image-level label reduction for multi-instance COCO annotations.
# Primary rule: category with largest total COCO `area` on the image.
# Ties: higher annotation count, then lower category_id.
LABEL_STRATEGY = "max_total_area"


@dataclass
class Sample:
    image_path: str
    label: str
    source: str = "unknown"
    annotation_ref: str | None = None
    split: str | None = None
    coco_image_id: int | None = None
    label_area: float | None = None
    num_annotations: int | None = None
    num_classes_on_image: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DatasetReport:
    root: str
    layout: str
    total_images: int
    valid_samples: int
    class_counts: dict[str, int]
    missing_or_corrupt: list[str] = field(default_factory=list)
    unrecognized_labels: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    split_counts: dict[str, int] = field(default_factory=dict)
    label_strategy: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def normalize_label(raw: str, class_names: Iterable[str] | None = None) -> str | None:
    key = raw.strip().lower().replace("-", "_")
    key = " ".join(key.split())
    # Prefer space-preserving lookup for official COCO names ("glass shatter")
    spaced = raw.strip().lower()
    spaced = " ".join(spaced.split())
    if spaced in CLASS_ALIASES:
        return CLASS_ALIASES[spaced]
    if key in CLASS_ALIASES:
        return CLASS_ALIASES[key]
    underscored = spaced.replace(" ", "_")
    if underscored in CLASS_ALIASES:
        return CLASS_ALIASES[underscored]
    allowed = set(class_names or get_class_names())
    if underscored in allowed:
        return underscored
    return None


def is_image_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTS


def _list_images(directory: Path) -> list[Path]:
    if not directory.exists():
        return []
    return sorted(p for p in directory.rglob("*") if is_image_file(p))


def is_cardd_coco_layout(root: Path) -> bool:
    """True when root matches the official CarDD_COCO release layout."""
    ann = root / "annotations"
    if not ann.exists():
        return False
    for json_name, img_dir in CARDD_COCO_SPLITS.values():
        if not (ann / json_name).exists():
            return False
        if not (root / img_dir).is_dir():
            return False
    return True


def detect_layout(root: Path) -> str:
    """Heuristic layout detection for CarDD variants."""
    if not root.exists():
        return "missing"

    if is_cardd_coco_layout(root):
        return "cardd_coco"

    # Generic COCO annotations
    ann_dirs = [root / "annotations", root / "Annotations", root / "ann"]
    for ann in ann_dirs:
        if ann.exists() and any(ann.glob("*.json")):
            return "coco"

    # Split folders with class subdirs
    split_names = {"train", "val", "valid", "validation", "test"}
    subdirs = [d for d in root.iterdir() if d.is_dir()] if root.exists() else []
    split_dirs = [d for d in subdirs if d.name.lower() in split_names]
    if split_dirs:
        for sd in split_dirs:
            class_dirs = [c for c in sd.iterdir() if c.is_dir()]
            if class_dirs:
                return "split_classification"

    # Direct class folders
    class_names = set(get_class_names())
    class_dirs = []
    for d in subdirs:
        norm = normalize_label(d.name)
        if norm and norm in class_names:
            class_dirs.append(d)
    if len(class_dirs) >= 2:
        return "classification"

    for name in ("labels.csv", "annotations.csv", "samples.csv", "train.csv"):
        if (root / name).exists():
            return "csv"

    images_dir = root / "images"
    if images_dir.exists():
        for name in ("labels.csv", "annotations.csv", "instances.json"):
            if (root / name).exists() or (root / "annotations" / name).exists():
                return "images_csv_or_json"
        return "images_only"

    if _list_images(root):
        return "flat_images"

    return "unknown"


def choose_primary_category(
    anns_for_image: list[dict[str, Any]],
) -> tuple[int, float, int] | None:
    """
    Reduce multi-instance annotations to one category id for classification.

    Returns (category_id, total_area, annotation_count) or None.
    """
    if not anns_for_image:
        return None

    area_by_cat: dict[int, float] = defaultdict(float)
    count_by_cat: Counter = Counter()
    for ann in anns_for_image:
        cid = int(ann["category_id"])
        area_by_cat[cid] += float(ann.get("area") or 0.0)
        count_by_cat[cid] += 1

    # Sort: max area, then max count, then min category id
    best = sorted(
        area_by_cat.keys(),
        key=lambda cid: (-area_by_cat[cid], -count_by_cat[cid], cid),
    )[0]
    return best, float(area_by_cat[best]), int(count_by_cat[best])


def _resolve_image_path(img_dir: Path, file_name: str) -> Path | None:
    candidate = img_dir / file_name
    if candidate.exists():
        return candidate
    candidate = img_dir / Path(file_name).name
    if candidate.exists():
        return candidate
    return None


def _load_one_coco_split(
    root: Path,
    split: str,
    json_name: str,
    img_dirname: str,
    class_names: list[str],
) -> tuple[list[Sample], list[str], list[str], dict[str, Any]]:
    """Load one official CarDD_COCO split. Does not modify JSON/images."""
    samples: list[Sample] = []
    unrecognized: list[str] = []
    missing: list[str] = []

    json_path = root / "annotations" / json_name
    img_dir = root / img_dirname
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    cats = {int(c["id"]): c["name"] for c in data.get("categories", [])}
    cat_map: dict[int, str | None] = {}
    for cid, cname in cats.items():
        norm = normalize_label(cname, class_names)
        cat_map[cid] = norm
        if norm is None:
            unrecognized.append(str(cname))

    images = {int(im["id"]): im for im in data.get("images", [])}
    anns_by_image: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for ann in data.get("annotations", []):
        anns_by_image[int(ann["image_id"])].append(ann)

    for image_id, im in images.items():
        file_name = im.get("file_name") or im.get("filename")
        if not file_name:
            missing.append(f"image_id={image_id}:missing_file_name")
            continue
        img_path = _resolve_image_path(img_dir, file_name)
        if img_path is None:
            missing.append(f"{img_dirname}/{file_name}")
            continue

        anns = anns_by_image.get(image_id, [])
        chosen = choose_primary_category(anns)
        if chosen is None:
            # Every CarDD image in verified release has annotations; skip if empty
            continue
        best_cid, total_area, _ann_count = chosen
        label = cat_map.get(best_cid)
        if label is None:
            unrecognized.append(str(cats.get(best_cid, best_cid)))
            continue

        distinct = {int(a["category_id"]) for a in anns}
        samples.append(
            Sample(
                image_path=str(img_path.resolve()),
                label=label,
                source=f"cardd_coco:{split}",
                annotation_ref=str(json_path),
                split=split,
                coco_image_id=image_id,
                label_area=total_area,
                num_annotations=len(anns),
                num_classes_on_image=len(distinct),
            )
        )

    meta = {
        "split": split,
        "annotation_file": str(json_path),
        "image_dir": str(img_dir),
        "num_images_json": len(images),
        "num_annotations_json": len(data.get("annotations", [])),
        "num_samples": len(samples),
        "categories_raw": [
            {"id": int(c["id"]), "name": c["name"]} for c in data.get("categories", [])
        ],
    }
    return samples, unrecognized, missing, meta


def load_cardd_coco_splits(
    root: Path,
    class_names: list[str] | None = None,
) -> tuple[dict[str, list[Sample]], list[str], list[str], dict[str, Any]]:
    """
    Load official CarDD train/val/test splits as classification samples.

    Preserves the dataset's published split. Does not reshuffle.
    """
    class_names = class_names or get_class_names()
    by_split: dict[str, list[Sample]] = {}
    unrecognized: list[str] = []
    missing: list[str] = []
    metas: dict[str, Any] = {"label_strategy": LABEL_STRATEGY, "splits": {}}

    for split, (json_name, img_dir) in CARDD_COCO_SPLITS.items():
        samples, unrec, miss, meta = _load_one_coco_split(
            root, split, json_name, img_dir, class_names
        )
        by_split[split] = samples
        unrecognized.extend(unrec)
        missing.extend(miss)
        metas["splits"][split] = meta

    return by_split, unrecognized, missing, metas


def _load_classification_folders(
    root: Path, class_names: list[str]
) -> tuple[list[Sample], list[str], list[str]]:
    samples: list[Sample] = []
    unrecognized: list[str] = []
    missing: list[str] = []

    for d in sorted(p for p in root.iterdir() if p.is_dir()):
        label = normalize_label(d.name, class_names)
        if label is None:
            if d.name.lower() in {
                "images",
                "annotations",
                "train",
                "val",
                "test",
                "valid",
                "validation",
                "train2017",
                "val2017",
                "test2017",
                "splits",
                "meta",
            }:
                continue
            unrecognized.append(d.name)
            continue
        for img in _list_images(d):
            samples.append(
                Sample(image_path=str(img.resolve()), label=label, source="classification")
            )
    return samples, unrecognized, missing


def _load_split_classification(
    root: Path, class_names: list[str]
) -> tuple[list[Sample], list[str], list[str]]:
    samples: list[Sample] = []
    unrecognized: list[str] = []
    missing: list[str] = []
    split_names = {"train", "val", "valid", "validation", "test"}

    for split_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        if split_dir.name.lower() not in split_names:
            continue
        split = "val" if split_dir.name.lower() in {"valid", "validation"} else split_dir.name.lower()
        for class_dir in sorted(p for p in split_dir.iterdir() if p.is_dir()):
            label = normalize_label(class_dir.name, class_names)
            if label is None:
                unrecognized.append(f"{split_dir.name}/{class_dir.name}")
                continue
            for img in _list_images(class_dir):
                samples.append(
                    Sample(
                        image_path=str(img.resolve()),
                        label=label,
                        source=f"split:{split}",
                        split=split,
                    )
                )
    return samples, unrecognized, missing


def _load_csv_labels(
    root: Path, class_names: list[str]
) -> tuple[list[Sample], list[str], list[str]]:
    samples: list[Sample] = []
    unrecognized: list[str] = []
    missing: list[str] = []

    csv_path = None
    for name in ("labels.csv", "annotations.csv", "samples.csv", "train.csv"):
        candidate = root / name
        if candidate.exists():
            csv_path = candidate
            break
    if csv_path is None:
        return samples, unrecognized, missing

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return samples, unrecognized, missing
        fields = {h.lower(): h for h in reader.fieldnames}
        path_key = fields.get("image") or fields.get("path") or fields.get("filename") or fields.get("file")
        label_key = fields.get("label") or fields.get("class") or fields.get("category") or fields.get("damage")
        if not path_key or not label_key:
            unrecognized.append(f"CSV missing path/label columns: {reader.fieldnames}")
            return samples, unrecognized, missing

        for row in reader:
            rel = row[path_key].strip()
            label = normalize_label(row[label_key], class_names)
            if label is None:
                unrecognized.append(row[label_key])
                continue
            img_path = Path(rel)
            if not img_path.is_absolute():
                candidates = [root / rel, root / "images" / Path(rel).name]
                img_path = next((c for c in candidates if c.exists()), candidates[0])
            if not img_path.exists():
                missing.append(str(img_path))
                continue
            samples.append(
                Sample(
                    image_path=str(img_path.resolve()),
                    label=label,
                    source="csv",
                    annotation_ref=str(csv_path),
                )
            )
    return samples, unrecognized, missing


def _load_coco(
    root: Path, class_names: list[str]
) -> tuple[list[Sample], list[str], list[str]]:
    """Generic single-file COCO fallback (non-CarDD_COCO layouts)."""
    samples: list[Sample] = []
    unrecognized: list[str] = []
    missing: list[str] = []

    ann_dir = next(
        (d for d in [root / "annotations", root / "Annotations", root / "ann"] if d.exists()),
        None,
    )
    if ann_dir is None:
        return samples, unrecognized, missing

    json_files = sorted(ann_dir.glob("*.json"))
    if not json_files:
        return samples, unrecognized, missing

    preferred = None
    for jf in json_files:
        name = jf.name.lower()
        if "train" in name or "all" in name or "instances" in name:
            preferred = jf
            break
    json_path = preferred or json_files[0]

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    cats = {int(c["id"]): c["name"] for c in data.get("categories", [])}
    cat_map: dict[int, str | None] = {}
    for cid, cname in cats.items():
        norm = normalize_label(cname, class_names)
        cat_map[cid] = norm
        if norm is None:
            unrecognized.append(str(cname))

    images = {int(im["id"]): im for im in data.get("images", [])}
    anns_by_image: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for ann in data.get("annotations", []):
        anns_by_image[int(ann["image_id"])].append(ann)

    image_roots = [root / "images", root / "Images", root / "img", root]
    for d in ("train2017", "val2017", "test2017"):
        if (root / d).exists():
            image_roots.insert(0, root / d)

    for image_id, im in images.items():
        file_name = im.get("file_name") or im.get("filename")
        if not file_name:
            continue
        img_path = None
        for base in image_roots:
            candidate = _resolve_image_path(base, file_name)
            if candidate is not None:
                img_path = candidate
                break
        if img_path is None:
            missing.append(str(file_name))
            continue
        chosen = choose_primary_category(anns_by_image.get(image_id, []))
        if chosen is None:
            continue
        best_cid, total_area, _ = chosen
        label = cat_map.get(best_cid)
        if label is None:
            continue
        anns = anns_by_image.get(image_id, [])
        samples.append(
            Sample(
                image_path=str(img_path.resolve()),
                label=label,
                source="coco",
                annotation_ref=str(json_path),
                coco_image_id=image_id,
                label_area=total_area,
                num_annotations=len(anns),
                num_classes_on_image=len({int(a["category_id"]) for a in anns}),
            )
        )
    return samples, unrecognized, missing


def load_samples(
    dataset_root: Path | None = None,
    cfg: dict[str, Any] | None = None,
) -> tuple[list[Sample], DatasetReport]:
    """Discover and load samples from CarDD without modifying originals."""
    cfg = cfg or load_config()
    root = Path(dataset_root) if dataset_root else get_dataset_root(cfg)
    class_names = get_class_names(cfg)
    layout = detect_layout(root)

    notes: list[str] = []
    split_counts: dict[str, int] = {}
    label_strategy = None

    if layout == "missing":
        report = DatasetReport(
            root=str(root),
            layout=layout,
            total_images=0,
            valid_samples=0,
            class_counts={c: 0 for c in class_names},
            notes=[
                f"Dataset root not found: {root}",
                "Obtain CarDD legally from https://cardd-ustc.github.io/ (requires PIC Lab consent).",
                "Set DATASET_ROOT in .env to the extracted CarDD_COCO folder path.",
            ],
        )
        return [], report

    samples: list[Sample] = []
    unrecognized: list[str] = []
    missing: list[str] = []

    if layout == "cardd_coco":
        by_split, unrecognized, missing, meta = load_cardd_coco_splits(root, class_names)
        for split_name, split_samples in by_split.items():
            samples.extend(split_samples)
            split_counts[split_name] = len(split_samples)
        label_strategy = meta.get("label_strategy")
        notes.append(
            "Detected official CarDD_COCO layout; preserving published train/val/test splits."
        )
        notes.append(
            f"Classification label strategy: {label_strategy} "
            "(category with largest total COCO area; ties by count then category_id)."
        )
        notes.append("Original annotation JSON and image files were not modified.")
    elif layout == "classification":
        samples, unrecognized, missing = _load_classification_folders(root, class_names)
    elif layout == "split_classification":
        samples, unrecognized, missing = _load_split_classification(root, class_names)
    elif layout in {"csv", "images_csv_or_json"}:
        samples, unrecognized, missing = _load_csv_labels(root, class_names)
    elif layout == "coco":
        samples, unrecognized, missing = _load_coco(root, class_names)
        label_strategy = LABEL_STRATEGY
    elif layout == "images_only":
        notes.append(
            "Found images/ but no labels. Provide class folders, CSV, or COCO annotations."
        )
    elif layout == "flat_images":
        notes.append(
            "Found flat images without labels. Organize into class folders or provide annotations."
        )
    else:
        notes.append(f"Unrecognized layout under {root}. Inspect and adapt ingestion.")

    seen: set[str] = set()
    unique: list[Sample] = []
    for s in samples:
        if s.image_path in seen:
            continue
        seen.add(s.image_path)
        unique.append(s)

    class_counts = {c: 0 for c in class_names}
    for s in unique:
        class_counts[s.label] = class_counts.get(s.label, 0) + 1

    # Prefer counting files in known image dirs for cardd_coco (avoid scanning annotations)
    if layout == "cardd_coco":
        total_images = sum(
            len([p for p in (root / d).iterdir() if p.is_file()])
            for _, d in CARDD_COCO_SPLITS.values()
            if (root / d).exists()
        )
    else:
        total_images = len(_list_images(root))

    report = DatasetReport(
        root=str(root.resolve()),
        layout=layout,
        total_images=total_images,
        valid_samples=len(unique),
        class_counts=class_counts,
        missing_or_corrupt=sorted(set(missing))[:100],
        unrecognized_labels=sorted(set(unrecognized)),
        notes=notes,
        split_counts=split_counts,
        label_strategy=label_strategy,
    )
    return unique, report


def validate_image_readable(path: Path) -> bool:
    """Quick validation that an image can be opened."""
    try:
        from PIL import Image

        with Image.open(path) as img:
            img.verify()
        return True
    except Exception:
        return False


def enrich_report_with_corrupt_check(
    samples: list[Sample], report: DatasetReport, limit: int | None = None
) -> DatasetReport:
    """Optionally scan samples for unreadable images (does not modify files)."""
    corrupt: list[str] = []
    iterable = samples if limit is None else samples[:limit]
    for s in iterable:
        if not validate_image_readable(Path(s.image_path)):
            corrupt.append(s.image_path)
    report.missing_or_corrupt = sorted(set(report.missing_or_corrupt + corrupt))
    return report
