# Architecture Notes

## Repository layout

```
vehicle-damage-detection/
├── frontend/               # React + Vite + Tailwind
├── backend/app/            # FastAPI
├── ml/
│   ├── models/             # custom_cnn.py, mobilenetv2.py
│   ├── training/           # train_* + common_training.py
│   ├── evaluation/         # metrics, plots, evaluate_models.py
│   ├── preprocessing/      # loader, preprocess, split
│   ├── inference/          # production predictor
│   └── artifacts/          # models, history, evaluation (gitignored binaries)
├── scripts/                # inspect / prepare / helpers
├── tests/
├── docs/
└── configs/default.yaml
```

## Fair comparison contract

Both models consume indexes from the same `ml/artifacts/splits/split.json`.

## Inference path

`POST /api/predict` → validate upload → `DamagePredictor.predict_bytes` → per-model preprocess → Keras `predict` → JSON.

Missing `.keras` files ⇒ `available: false` / HTTP 503 — never random logits.
