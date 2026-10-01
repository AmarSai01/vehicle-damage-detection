"""
MobileNetV2 transfer-learning model for CarDD damage classification.

Uses TensorFlow/Keras MobileNetV2 with weights='imagenet'.

Training procedure (implemented in training scripts):
  Phase 1 — Freeze MobileNetV2 base; train classification head.
  Phase 2 — Unfreeze upper layers; fine-tune with a smaller learning rate.

Do not replace this architecture with ResNet / EfficientNet / VGG / DenseNet.
"""

from __future__ import annotations

from typing import Any

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2


def build_mobilenetv2(
    num_classes: int = 6,
    input_shape: tuple[int, int, int] = (224, 224, 3),
    weights: str | None = "imagenet",
    dropout_rate: float = 0.3,
    name: str = "mobilenetv2_cardd",
) -> tuple[keras.Model, keras.Model]:
    """
    Build MobileNetV2 + classification head.

    Returns:
        full_model: end-to-end model
        base_model: MobileNetV2 backbone (for freeze/unfreeze control)
    """
    if num_classes < 2:
        raise ValueError("num_classes must be >= 2")

    inputs = keras.Input(shape=input_shape, name="input_image")

    base_model = MobileNetV2(
        input_shape=input_shape,
        include_top=False,
        weights=weights,
        name="mobilenetv2_base",
    )
    # Phase-1 default: freeze entire base
    base_model.trainable = False

    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dropout(dropout_rate, name="head_dropout")(x)
    x = layers.Dense(256, activation="relu", name="head_dense")(x)
    x = layers.Dropout(dropout_rate / 2, name="head_dropout_2")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name=name)
    return model, base_model


def compile_mobilenetv2(
    model: keras.Model,
    learning_rate: float = 1e-3,
) -> keras.Model:
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def unfreeze_for_finetuning(
    base_model: keras.Model,
    fine_tune_at: int = 100,
) -> None:
    """
    Unfreeze layers from `fine_tune_at` onward for Phase-2 fine-tuning.

    MobileNetV2 has ~154 layers; fine_tune_at=100 unfreezes the upper portion.
    """
    base_model.trainable = True
    for i, layer in enumerate(base_model.layers):
        layer.trainable = i >= fine_tune_at


def describe_architecture(num_classes: int = 6) -> dict[str, Any]:
    model, base = build_mobilenetv2(num_classes=num_classes, weights=None)
    return {
        "name": "MobileNetV2",
        "pretrained_backbone": True,
        "backbone_weights": "imagenet",
        "input_shape": list(model.input_shape[1:]),
        "output_classes": num_classes,
        "total_parameters": int(model.count_params()),
        "base_parameters": int(base.count_params()),
        "head": [
            "GlobalAveragePooling2D",
            "Dropout",
            "Dense(256, ReLU)",
            "Dropout",
            "Dense(num_classes, Softmax)",
        ],
        "transfer_learning": {
            "phase_1": "Freeze base; train head",
            "phase_2": "Unfreeze upper layers; fine-tune at lower LR",
        },
    }


if __name__ == "__main__":
    m, b = build_mobilenetv2(weights=None)
    m.summary()
    print(describe_architecture())
