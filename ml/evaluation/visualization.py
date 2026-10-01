"""Visualization helpers for training curves and confusion matrices."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns


def plot_training_curves(history: dict[str, list[float]], output_dir: Path, model_name: str) -> dict[str, str]:
    """Save accuracy and loss curves. Returns paths of generated figures."""
    output_dir.mkdir(parents=True, exist_ok=True)
    paths: dict[str, str] = {}

    def _plot(keys: list[str], title: str, ylabel: str, filename: str) -> None:
        available = [k for k in keys if k in history and history[k]]
        if not available:
            return
        plt.figure(figsize=(8, 5))
        for k in available:
            plt.plot(history[k], label=k)
        plt.title(title)
        plt.xlabel("Epoch")
        plt.ylabel(ylabel)
        plt.legend()
        plt.grid(True, alpha=0.3)
        out = output_dir / filename
        plt.tight_layout()
        plt.savefig(out, dpi=150)
        plt.close()
        paths[filename] = str(out)

    _plot(
        ["accuracy"],
        f"{model_name} — Training Accuracy",
        "Accuracy",
        f"{model_name}_train_accuracy.png",
    )
    _plot(
        ["val_accuracy"],
        f"{model_name} — Validation Accuracy",
        "Accuracy",
        f"{model_name}_val_accuracy.png",
    )
    _plot(
        ["loss"],
        f"{model_name} — Training Loss",
        "Loss",
        f"{model_name}_train_loss.png",
    )
    _plot(
        ["val_loss"],
        f"{model_name} — Validation Loss",
        "Loss",
        f"{model_name}_val_loss.png",
    )
    # Combined
    if "accuracy" in history and "val_accuracy" in history:
        plt.figure(figsize=(8, 5))
        plt.plot(history["accuracy"], label="train_accuracy")
        plt.plot(history["val_accuracy"], label="val_accuracy")
        plt.title(f"{model_name} — Accuracy")
        plt.xlabel("Epoch")
        plt.ylabel("Accuracy")
        plt.legend()
        plt.grid(True, alpha=0.3)
        out = output_dir / f"{model_name}_accuracy.png"
        plt.tight_layout()
        plt.savefig(out, dpi=150)
        plt.close()
        paths[f"{model_name}_accuracy.png"] = str(out)

    if "loss" in history and "val_loss" in history:
        plt.figure(figsize=(8, 5))
        plt.plot(history["loss"], label="train_loss")
        plt.plot(history["val_loss"], label="val_loss")
        plt.title(f"{model_name} — Loss")
        plt.xlabel("Epoch")
        plt.ylabel("Loss")
        plt.legend()
        plt.grid(True, alpha=0.3)
        out = output_dir / f"{model_name}_loss.png"
        plt.tight_layout()
        plt.savefig(out, dpi=150)
        plt.close()
        paths[f"{model_name}_loss.png"] = str(out)

    return paths


def plot_confusion_matrix(
    cm: list[list[int]] | np.ndarray,
    class_names: list[str],
    output_path: Path,
    title: str,
) -> str:
    cm_arr = np.asarray(cm)
    plt.figure(figsize=(9, 7))
    sns.heatmap(
        cm_arr,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
    )
    plt.title(title)
    plt.ylabel("True label")
    plt.xlabel("Predicted label")
    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=150)
    plt.close()
    return str(output_path)


def save_classification_report_text(report: dict[str, Any], output_path: Path) -> str:
    """Write a human-readable classification report."""
    lines = []
    header = f"{'class':20} {'precision':>10} {'recall':>10} {'f1':>10} {'support':>10}"
    lines.append(header)
    lines.append("-" * len(header))
    for key, val in report.items():
        if not isinstance(val, dict):
            continue
        if key in {"accuracy"}:
            continue
        lines.append(
            f"{key:20} {val.get('precision', 0):10.4f} {val.get('recall', 0):10.4f} "
            f"{val.get('f1-score', 0):10.4f} {int(val.get('support', 0)):10d}"
        )
    if "accuracy" in report:
        lines.append(f"\naccuracy: {report['accuracy']:.4f}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return str(output_path)
