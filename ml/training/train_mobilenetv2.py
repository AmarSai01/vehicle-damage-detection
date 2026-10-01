"""Train MobileNetV2 on CarDD with two-phase transfer learning."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.config import get_artifacts_paths, get_class_names, get_num_classes, load_config
from ml.models.mobilenetv2 import (
    build_mobilenetv2,
    compile_mobilenetv2,
    describe_architecture,
    unfreeze_for_finetuning,
)
from ml.paths import ensure_dir
from ml.preprocessing.split_dataset import load_split
from ml.training.common_training import (
    configure_gpu_memory_growth,
    default_callbacks,
    make_tf_dataset,
    model_file_size_mb,
    save_history,
    set_reproducible_seed,
)


def parse_args() -> argparse.Namespace:
    cfg = load_config()
    mcfg = cfg["models"]["mobilenetv2"]
    p = argparse.ArgumentParser(description="Train MobileNetV2 on CarDD (transfer learning)")
    p.add_argument("--head-epochs", type=int, default=mcfg.get("head_epochs", 15))
    p.add_argument("--fine-tune-epochs", type=int, default=mcfg.get("fine_tune_epochs", 35))
    p.add_argument("--batch-size", type=int, default=cfg["training"]["batch_size"])
    p.add_argument("--learning-rate", type=float, default=cfg["training"]["learning_rate"])
    p.add_argument(
        "--fine-tune-lr",
        type=float,
        default=mcfg.get("fine_tune_learning_rate", 1e-4),
    )
    p.add_argument("--fine-tune-at", type=int, default=mcfg.get("fine_tune_at", 100))
    p.add_argument("--image-size", type=int, default=cfg["preprocessing"]["image_size"])
    p.add_argument("--seed", type=int, default=cfg["split"]["seed"])
    p.add_argument(
        "--weights",
        type=str,
        default=mcfg.get("weights", "imagenet"),
        help="Backbone weights (default: imagenet)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    cfg = load_config()
    set_reproducible_seed(args.seed)
    device = configure_gpu_memory_growth()
    print(f"Device: {device}")

    split = load_split()
    class_names = get_class_names(cfg)
    num_classes = get_num_classes(cfg)
    paths = get_artifacts_paths(cfg)
    ensure_dir(paths["models"])

    print(f"Classes ({num_classes}): {class_names}")
    print(
        f"Samples — train: {len(split.train)}, val: {len(split.val)}, test: {len(split.test)}"
    )
    print("Architecture:", json.dumps(describe_architecture(num_classes), indent=2))

    train_ds = make_tf_dataset(
        split.train,
        model_kind="mobilenetv2",
        batch_size=args.batch_size,
        image_size=args.image_size,
        class_names=class_names,
        shuffle=True,
        seed=args.seed,
        augment=False,
    )
    val_ds = make_tf_dataset(
        split.val,
        model_kind="mobilenetv2",
        batch_size=args.batch_size,
        image_size=args.image_size,
        class_names=class_names,
        shuffle=False,
        seed=args.seed,
        augment=False,
    )

    weights = None if args.weights in {"none", "None", ""} else args.weights
    model, base_model = build_mobilenetv2(
        num_classes=num_classes,
        input_shape=(args.image_size, args.image_size, 3),
        weights=weights,
    )
    model = compile_mobilenetv2(model, learning_rate=args.learning_rate)
    model.summary()

    # ---- Phase 1: train head ----
    print("\n=== Phase 1: Freeze backbone, train classification head ===")
    callbacks_p1 = default_callbacks(
        model_name="mobilenetv2",
        monitor=cfg["training"]["checkpoint_monitor"],
        mode=cfg["training"]["checkpoint_mode"],
        patience=cfg["training"]["early_stopping_patience"],
        reduce_lr_patience=cfg["training"]["reduce_lr_patience"],
        reduce_lr_factor=cfg["training"]["reduce_lr_factor"],
        min_lr=cfg["training"]["min_lr"],
    )
    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.head_epochs,
        callbacks=callbacks_p1,
        verbose=1,
    )

    # ---- Phase 2: fine-tune ----
    print("\n=== Phase 2: Unfreeze upper layers, fine-tune ===")
    unfreeze_for_finetuning(base_model, fine_tune_at=args.fine_tune_at)
    model = compile_mobilenetv2(model, learning_rate=args.fine_tune_lr)

    callbacks_p2 = default_callbacks(
        model_name="mobilenetv2",
        monitor=cfg["training"]["checkpoint_monitor"],
        mode=cfg["training"]["checkpoint_mode"],
        patience=cfg["training"]["early_stopping_patience"],
        reduce_lr_patience=cfg["training"]["reduce_lr_patience"],
        reduce_lr_factor=cfg["training"]["reduce_lr_factor"],
        min_lr=cfg["training"]["min_lr"],
    )
    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.fine_tune_epochs,
        callbacks=callbacks_p2,
        verbose=1,
    )

    # Merge histories
    merged: dict[str, list[float]] = {}
    for h in (history1.history, history2.history):
        for k, vals in h.items():
            merged.setdefault(k, []).extend([float(v) for v in vals])
    hist_path = save_history(merged, "mobilenetv2")

    best_path = paths["models"] / "mobilenetv2.keras"
    model.save(best_path)

    meta = {
        "model": "mobilenetv2",
        "classes": class_names,
        "phase1_epochs": len(history1.history.get("loss", [])),
        "phase2_epochs": len(history2.history.get("loss", [])),
        "seed": args.seed,
        "batch_size": args.batch_size,
        "learning_rate": args.learning_rate,
        "fine_tune_lr": args.fine_tune_lr,
        "fine_tune_at": args.fine_tune_at,
        "weights": args.weights,
        "image_size": args.image_size,
        "parameters": int(model.count_params()),
        "model_size_mb": model_file_size_mb(best_path),
        "history_path": str(hist_path),
        "model_path": str(best_path),
        "device": device,
        "status": "trained",
    }
    with open(paths["history"] / "mobilenetv2_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Saved model → {best_path}")
    print(f"Saved history → {hist_path}")
    print("Next: python -m ml.evaluation.evaluate_models")


if __name__ == "__main__":
    main()
