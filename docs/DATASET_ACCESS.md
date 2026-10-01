3# Dataset Access — CarDD

## Status

This project **stops at the external access step** for CarDD.

CarDD is **not** bundled. Unauthorized copies must not be used.

## What you must do manually

1. Visit **https://cardd-ustc.github.io/**
2. Read **https://cardd-ustc.github.io/docs/CarDD_license.pdf**
3. Fill the consent form (affiliation, name, email, signature)
4. Email the PIC Lab contact listed on the official site to request download access
5. After approval, download and extract the dataset
6. Set in `.env`:

```env
DATASET_ROOT=C:/path/to/extracted/CarDD
```

Prefer a relative path if you place it under `./data/CarDD`.

7. Run:

```powershell
python scripts/inspect_dataset.py
python scripts/prepare_dataset.py
```

## What this repo will do after you provide the data

- Detect folder/COCO/CSV layout via the ingestion adapter
- Build stratified splits **without modifying** original files
- Train Custom CNN + MobileNetV2
- Evaluate and populate real comparison metrics

## Citation

See README §22 / CarDD paper (IEEE TITS 2023).
