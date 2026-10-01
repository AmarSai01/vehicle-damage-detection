# CarDD_COCO — Dataset Notes for Classification

Derived from the authorized local release. **Original CarDD files are never modified.**
Validation artifact: `ml/artifacts/dataset_reports/classification_label_validation.json`

---

## Dataset structure

```
CarDD_COCO/
├── annotations/
│   ├── instances_train2017.json
│   ├── instances_val2017.json
│   └── instances_test2017.json
├── train2017/          # 2816 images
├── val2017/            # 810 images
└── test2017/           # 374 images
```

Mapping:

- `images[].id` ↔ `annotations[].image_id`
- `images[].file_name` (e.g. `000001.jpg`) → file under the matching `*2017/` folder

Annotation fields used: `category_id`, `area`, `bbox`, `segmentation`, `image_id`.

Top-level JSON keys are identical across train/val/test: `info`, `licenses`, `images`, `annotations`, `categories`.

---

## Six classes (verified from COCO JSON)

| category_id | Exact COCO name | Internal class id |
|------------:|-----------------|-------------------|
| 1 | dent | `dent` |
| 2 | scratch | `scratch` |
| 3 | crack | `crack` |
| 4 | glass shatter | `glass_shatter` |
| 5 | lamp broken | `lamp_broken` |
| 6 | tire flat | `tire_flat` |

**No “no damage” class** — CarDD does not provide one.

---

## Split statistics (official CarDD partitions)

| Split | Images | Instance annotations |
|-------|-------:|---------------------:|
| train | 2816 | 6211 |
| val | 810 | 1744 |
| test | 374 | 785 |
| **Total** | **4000** | **8740** |

Classification indexes preserve these official splits (`source = cardd_coco_official`).
Path leakage check: **train ∩ val = 0**, **train ∩ test = 0**, **val ∩ test = 0**.

---

## Multi-label findings

CarDD is an **instance** dataset. One image may contain several damage instances and several categories.

| Split | Single-class images | Multi-class images |
|-------|--------------------:|-------------------:|
| train | 1732 | 1084 |
| val | 504 | 306 |
| test | 234 | 140 |

Example (train `000001.jpg`): categories `{scratch, tire flat}` with 2 annotations.

**Policy decision:** multi-class images are **not discarded**. They are retained with one deterministic image-level label (below). This introduces label reduction ambiguity that must be stated in academic methods, but it is reproducible and does not silently drop data.

---

## Label-conversion methodology

Goal: train **image-level** classifiers (Custom CNN, MobileNetV2) that require exactly one target class per image.

### Final classification policy: `max_total_area`

For each image:

1. Group all COCO annotations for that `image_id`.
2. Sum the COCO `area` field per `category_id`.
3. Assign the category with the **largest total area**.
4. Tie-breakers (deterministic):
   1. higher annotation count for that category
   2. lower `category_id`
5. Map the official COCO name to the internal snake_case id.

Implementation: `ml/preprocessing/dataset_loader.py` → `choose_primary_category()`.

### Guarantees checked by validation

1. Every classification sample has **exactly one** target class.
2. Multi-class images are **kept** (sample count == COCO image count per split).
3. Assigned labels **recompute identically** from original JSON under this policy (0 mismatches).
4. Every referenced image file **exists** on disk (0 missing).
5. Official split membership preserved; **no path leakage**.

---

## Class imbalance findings (after conversion)

Image-level counts after `max_total_area`:

| Class | Train | Val | Test | All | Share (all) |
|-------|------:|----:|-----:|----:|------------:|
| dent | 823 | 241 | 109 | 1173 | 29.3% |
| scratch | 932 | 270 | 122 | 1324 | 33.1% |
| crack | 61 | 25 | 8 | 94 | 2.4% |
| glass_shatter | 457 | 131 | 65 | 653 | 16.3% |
| lamp_broken | 333 | 88 | 42 | 463 | 11.6% |
| tire_flat | 210 | 55 | 28 | 293 | 7.3% |

**Imbalance notes:**

- `scratch` and `dent` dominate.
- `crack` is rare after area-based reduction (only **8** test images) — expect unstable per-class metrics for crack.
- Macro-F1 will be more informative than accuracy alone.

Training mitigations (when training begins — not applied yet): class weights / focal loss / careful early stopping may help; do not fabricate balanced data.

---

## Final classification policy (summary)

| Item | Choice |
|------|--------|
| Task | Single-label image classification (6 classes) |
| Multi-class images | **Retained** |
| Reduction rule | `max_total_area` (+ count, + category_id ties) |
| Splits | Official CarDD train/val/test only |
| Original files | Unmodified |
| Derived artifacts | `ml/artifacts/splits/`, `ml/artifacts/dataset_reports/` |

Ambiguity is **documented, not hidden**. The experiment remains scientifically valid if this reduction is reported. Stopping to ask the user is unnecessary unless a different policy (e.g. discard multi-class, or multi-label head) is preferred.

---

## Validation status

Last run: `python scripts/validate_classification_labels.py`

- Safe to train under documented policy: **yes**
- Errors: **none**
- Missing/corrupt referenced images: **0**
- Path leakage: **none**
- Tests: `pytest tests/ml tests/backend` — passing

### Next command (Custom CNN only — run when ready)

```powershell
.\.venv\Scripts\python.exe -m ml.training.train_custom_cnn
```
