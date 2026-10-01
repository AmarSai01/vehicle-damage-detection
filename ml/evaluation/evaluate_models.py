"""Evaluate both models on the held-out test split and produce comparison artifacts."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import numpy as np
from PIL import Image

from ml.config import get_artifacts_paths, get_class_names, load_config
from ml.evaluation.metrics import compute_classification_metrics
from ml.evaluation.visualization import (
    plot_confusion_matrix,
    plot_training_curves,
    save_classification_report_text,
)
from ml.paths import ensure_dir
from ml.preprocessing.preprocessing import (
    preprocess_for_custom_cnn,
    preprocess_for_mobilenetv2,
)
from ml.preprocessing.split_dataset import load_split
from ml.training.common_training import model_file_size_mb


def _predict_model(
    model_path: Path,
    samples,
    model_kind: str,
    class_names: list[str],
    image_size: int,
    batch_size: int = 16,
) -> tuple[np.ndarray, np.ndarray, float, int]:
    """Return y_true, y_pred, mean_inference_ms, param_count."""
    import tensorflow as tf

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    model = tf.keras.models.load_model(model_path)
    label_to_idx = {c: i for i, c in enumerate(class_names)}

    y_true: list[int] = []
    y_pred: list[int] = []
    times: list[float] = []

    batch_imgs: list[np.ndarray] = []
    batch_labels: list[int] = []

    def flush() -> None:
        nonlocal batch_imgs, batch_labels
        if not batch_imgs:
            return
        x = np.stack(batch_imgs, axis=0)
        t0 = time.perf_counter()
        probs = model.predict(x, verbose=0)
        elapsed = (time.perf_counter() - t0) * 1000.0
        per = elapsed / len(batch_imgs)
        preds = np.argmax(probs, axis=1)
        for lbl, pred in zip(batch_labels, preds):
            y_true.append(lbl)
            y_pred.append(int(pred))
            times.append(per)
        batch_imgs, batch_labels = [], []

    for s in samples:
        try:
            img = Image.open(s.image_path).convert("RGB")
            if model_kind == "mobilenetv2":
                arr = preprocess_for_mobilenetv2(img, image_size)
            else:
                arr = preprocess_for_custom_cnn(img, image_size)
            batch_imgs.append(arr)
            batch_labels.append(label_to_idx[s.label])
            if len(batch_imgs) >= batch_size:
                flush()
        except Exception as exc:
            print(f"Skipping {s.image_path}: {exc}")
    flush()

    mean_ms = float(np.mean(times)) if times else 0.0
    params = int(model.count_params())
    return np.array(y_true), np.array(y_pred), mean_ms, params


def evaluate_one(
    model_key: str,
    model_filename: str,
    model_kind: str,
    samples,
    class_names: list[str],
    image_size: int,
    eval_dir: Path,
    history_dir: Path,
    models_dir: Path,
) -> dict | None:
    model_path = models_dir / model_filename
    if not model_path.exists():
        print(f"[{model_key}] Not trained yet — missing {model_path}")
        return None

    print(f"[{model_key}] Evaluating on {len(samples)} test samples...")
    y_true, y_pred, mean_ms, params = _predict_model(
        model_path, samples, model_kind, class_names, image_size
    )
    metrics = compute_classification_metrics(y_true, y_pred, class_names)
    metrics["inference_time_ms_mean"] = mean_ms
    metrics["parameters"] = params
    metrics["model_size_mb"] = model_file_size_mb(model_path)
    metrics["model_path"] = str(model_path)
    metrics["status"] = "evaluated"

    # Confusion matrix figure
    cm_path = eval_dir / f"{model_key}_confusion_matrix.png"
    plot_confusion_matrix(
        metrics["confusion_matrix"],
        class_names,
        cm_path,
        title=f"{model_key} Confusion Matrix",
    )
    metrics["confusion_matrix_path"] = str(cm_path)

    # Classification report text
    report_path = eval_dir / f"{model_key}_classification_report.txt"
    save_classification_report_text(metrics["classification_report"], report_path)
    metrics["classification_report_path"] = str(report_path)

    # Training curves if history exists
    hist_file = history_dir / f"{model_key}_history.json"
    if hist_file.exists():
        with open(hist_file, encoding="utf-8") as f:
            history = json.load(f)
        fig_paths = plot_training_curves(history, eval_dir, model_key)
        metrics["training_curve_paths"] = fig_paths

    out_json = eval_dir / f"{model_key}_metrics.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(f"[{model_key}] accuracy={metrics['accuracy']:.4f} f1_macro={metrics['f1_macro']:.4f}")
    return metrics


def build_comparison(results: dict[str, dict | None]) -> dict:
    """Build comparison table from real metrics only."""
    rows = [
        "accuracy",
        "precision_macro",
        "recall_macro",
        "f1_macro",
        "inference_time_ms_mean",
        "model_size_mb",
        "parameters",
    ]
    table: dict[str, dict] = {}
    for row in rows:
        table[row] = {}
        for model_key, metrics in results.items():
            if metrics is None:
                table[row][model_key] = None
            else:
                table[row][model_key] = metrics.get(row)

    available = {k: v for k, v in results.items() if v is not None}
    summary = {
        "status": "evaluated" if available else "not_trained",
        "message": (
            "Real evaluation results."
            if available
            else "Evaluation results will appear after training."
        ),
        "table": table,
        "models": {
            k: (
                {
                    "status": "evaluated",
                    "accuracy": v["accuracy"],
                    "precision": v["precision_macro"],
                    "recall": v["recall_macro"],
                    "f1": v["f1_macro"],
                    "inference_time_ms": v["inference_time_ms_mean"],
                    "model_size_mb": v["model_size_mb"],
                    "parameters": v["parameters"],
                }
                if v
                else {"status": "not_trained", "message": "Not trained yet."}
            )
            for k, v in results.items()
        },
    }
    # Do not declare a winner unless both exist — still don't bias; just report
    if len(available) == 2:
        summary["note"] = (
            "Compare metrics directly; do not assume superiority without numbers."
        )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate Custom CNN and MobileNetV2")
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args()

    cfg = load_config()
    class_names = get_class_names(cfg)
    paths = get_artifacts_paths(cfg)
    eval_dir = ensure_dir(paths["evaluation"])
    image_size = cfg["preprocessing"]["image_size"]

    try:
        split = load_split()
    except FileNotFoundError as exc:
        print(str(exc))
        comparison = {
            "status": "not_trained",
            "message": "Evaluation results will appear after training.",
            "models": {
                "custom_cnn": {"status": "not_trained", "message": "Not trained yet."},
                "mobilenetv2": {"status": "not_trained", "message": "Not trained yet."},
            },
        }
        with open(paths["comparison"], "w", encoding="utf-8") as f:
            json.dump(comparison, f, indent=2)
        return

    results = {
        "custom_cnn": evaluate_one(
            "custom_cnn",
            cfg["models"]["custom_cnn"]["filename"],
            "custom_cnn",
            split.test,
            class_names,
            image_size,
            eval_dir,
            paths["history"],
            paths["models"],
        ),
        "mobilenetv2": evaluate_one(
            "mobilenetv2",
            cfg["models"]["mobilenetv2"]["filename"],
            "mobilenetv2",
            split.test,
            class_names,
            image_size,
            eval_dir,
            paths["history"],
            paths["models"],
        ),
    }

    comparison = build_comparison(results)
    with open(paths["comparison"], "w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2)
    with open(paths["metrics"], "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nComparison written → {paths['comparison']}")
    print(json.dumps(comparison["models"], indent=2))


if __name__ == "__main__":
    main()
