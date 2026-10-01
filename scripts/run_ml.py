#!/usr/bin/env python
"""Convenience launcher for training / evaluation commands."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(module: str, extra: list[str]) -> int:
    cmd = [sys.executable, "-m", module, *extra]
    print("→", " ".join(cmd))
    return subprocess.call(cmd, cwd=str(ROOT))


def main() -> None:
    parser = argparse.ArgumentParser(description="ML workflow helpers")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("inspect")
    sub.add_parser("prepare")

    p_train_cnn = sub.add_parser("train-cnn")
    p_train_cnn.add_argument("extra", nargs=argparse.REMAINDER)

    p_train_mnv2 = sub.add_parser("train-mobilenet")
    p_train_mnv2.add_argument("extra", nargs=argparse.REMAINDER)

    p_eval = sub.add_parser("evaluate")
    p_eval.add_argument("extra", nargs=argparse.REMAINDER)

    args = parser.parse_args()

    if args.cmd == "inspect":
        return sys.exit(subprocess.call([sys.executable, str(ROOT / "scripts" / "inspect_dataset.py")], cwd=str(ROOT)))
    if args.cmd == "prepare":
        return sys.exit(subprocess.call([sys.executable, str(ROOT / "scripts" / "prepare_dataset.py")], cwd=str(ROOT)))
    if args.cmd == "train-cnn":
        extra = args.extra[1:] if args.extra and args.extra[0] == "--" else args.extra
        sys.exit(run("ml.training.train_custom_cnn", extra))
    if args.cmd == "train-mobilenet":
        extra = args.extra[1:] if args.extra and args.extra[0] == "--" else args.extra
        sys.exit(run("ml.training.train_mobilenetv2", extra))
    if args.cmd == "evaluate":
        extra = args.extra[1:] if args.extra and args.extra[0] == "--" else args.extra
        sys.exit(run("ml.evaluation.evaluate_models", extra))


if __name__ == "__main__":
    main()
