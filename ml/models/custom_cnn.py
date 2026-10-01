"""
Custom CNN for CarDD damage classification — built from scratch (no pretrained backbone).

Architecture overview (input 224×224×3 → 6-class softmax):

Block 1:
  Conv2D(32, 3×3) → BatchNorm → ReLU → Conv2D(32, 3×3) → BatchNorm → ReLU
  MaxPool(2×2) → Dropout(0.25)

Block 2:
  Conv2D(64, 3×3) → BatchNorm → ReLU → Conv2D(64, 3×3) → BatchNorm → ReLU
  MaxPool(2×2) → Dropout(0.25)

Block 3:
  Conv2D(128, 3×3) → BatchNorm → ReLU → Conv2D(128, 3×3) → BatchNorm → ReLU
  MaxPool(2×2) → Dropout(0.25)

Block 4:
  Conv2D(256, 3×3) → BatchNorm → ReLU → Conv2D(256, 3×3) → BatchNorm → ReLU
  MaxPool(2×2) → Dropout(0.25)

Classification head:
  Flatten → Dense(512) → BatchNorm → ReLU → Dropout(0.5)
  Dense(num_classes) → Softmax

Design rationale (for viva):
- Progressive channel growth captures low-level edges then higher-level damage textures.
- BatchNorm stabilizes training on moderate-sized academic datasets.
- Dropout + pooling reduce overfitting without a pretrained backbone.
- Softmax produces a calibrated multi-class probability distribution over CarDD classes.
"""

from __future__ import annotations

from typing import Any

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


def build_custom_cnn(
    num_classes: int = 6,
    input_shape: tuple[int, int, int] = (224, 224, 3),
    dropout_conv: float = 0.25,
    dropout_dense: float = 0.5,
    name: str = "custom_cnn",
) -> keras.Model:
    """Build the Custom CNN (no pretrained weights)."""
    if num_classes < 2:
        raise ValueError("num_classes must be >= 2")

    inputs = keras.Input(shape=input_shape, name="input_image")
    x = inputs

    def conv_block(x_in: Any, filters: int, block_id: int) -> Any:
        y = layers.Conv2D(
            filters,
            kernel_size=3,
            padding="same",
            use_bias=False,
            name=f"block{block_id}_conv1",
        )(x_in)
        y = layers.BatchNormalization(name=f"block{block_id}_bn1")(y)
        y = layers.Activation("relu", name=f"block{block_id}_relu1")(y)

        y = layers.Conv2D(
            filters,
            kernel_size=3,
            padding="same",
            use_bias=False,
            name=f"block{block_id}_conv2",
        )(y)
        y = layers.BatchNormalization(name=f"block{block_id}_bn2")(y)
        y = layers.Activation("relu", name=f"block{block_id}_relu2")(y)

        y = layers.MaxPooling2D(pool_size=2, name=f"block{block_id}_pool")(y)
        y = layers.Dropout(dropout_conv, name=f"block{block_id}_dropout")(y)
        return y

    x = conv_block(x, 32, 1)
    x = conv_block(x, 64, 2)
    x = conv_block(x, 128, 3)
    x = conv_block(x, 256, 4)

    x = layers.Flatten(name="flatten")(x)
    x = layers.Dense(512, use_bias=False, name="dense_512")(x)
    x = layers.BatchNormalization(name="dense_bn")(x)
    x = layers.Activation("relu", name="dense_relu")(x)
    x = layers.Dropout(dropout_dense, name="dense_dropout")(x)

    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)
    model = keras.Model(inputs=inputs, outputs=outputs, name=name)
    return model


def compile_custom_cnn(
    model: keras.Model,
    learning_rate: float = 1e-3,
) -> keras.Model:
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def describe_architecture(num_classes: int = 6) -> dict[str, Any]:
    """Structured description useful for documentation / viva."""
    model = build_custom_cnn(num_classes=num_classes)
    return {
        "name": "Custom CNN",
        "pretrained_backbone": False,
        "input_shape": list(model.input_shape[1:]),
        "output_classes": num_classes,
        "total_parameters": int(model.count_params()),
        "blocks": [
            "Conv-BN-ReLU ×2 → MaxPool → Dropout (32 filters)",
            "Conv-BN-ReLU ×2 → MaxPool → Dropout (64 filters)",
            "Conv-BN-ReLU ×2 → MaxPool → Dropout (128 filters)",
            "Conv-BN-ReLU ×2 → MaxPool → Dropout (256 filters)",
            "Flatten → Dense(512)-BN-ReLU-Dropout → Softmax",
        ],
    }


if __name__ == "__main__":
    m = build_custom_cnn()
    m.summary()
    print(describe_architecture())
