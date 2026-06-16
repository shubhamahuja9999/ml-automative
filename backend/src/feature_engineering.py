"""Feature engineering — the single source of truth shared by train & serve.

Both the training pipeline and the inference path call into the same two
functions so the feature definitions can never drift:

* :func:`create_features`  — derive ``car_age`` and ``mileage_per_year``.
* :func:`build_model_matrix` — one-hot encode and align columns for the model.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from src import config


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add the engineered numeric features used by the model.

    Two features are derived:

    * ``car_age`` = :data:`config.REFERENCE_YEAR` − ``year``
    * ``mileage_per_year`` = ``mileage`` / ``car_age`` (0 when age is 0)

    Args:
        df: A DataFrame that contains at least ``year`` and ``mileage``.

    Returns:
        A copy of ``df`` with the engineered columns appended.
    """
    out = df.copy()
    out["car_age"] = config.REFERENCE_YEAR - out["year"]

    with np.errstate(divide="ignore", invalid="ignore"):
        out["mileage_per_year"] = out["mileage"] / out["car_age"]

    out["mileage_per_year"] = (
        out["mileage_per_year"]
        .replace([np.inf, -np.inf], 0)
        .fillna(0)
    )
    return out


def build_model_matrix(
    df: pd.DataFrame,
    feature_columns: list[str] | None = None,
) -> pd.DataFrame:
    """Turn an engineered DataFrame into the numeric matrix the model expects.

    Drops identifier/target columns, one-hot encodes the categorical columns
    (``drop_first=True``) and—when ``feature_columns`` is supplied—reindexes the
    result to exactly match the training-time column order, filling any missing
    dummy columns with zeros.

    Args:
        df: DataFrame already passed through :func:`create_features`.
        feature_columns: The ordered column list captured at training time. Pass
            ``None`` during training (to *learn* the columns) and the persisted
            list during inference (to *align* to them).

    Returns:
        A numeric DataFrame ready for ``model.fit`` / ``model.predict``.
    """
    matrix = df.drop(
        columns=[c for c in config.DROP_COLUMNS if c in df.columns],
        errors="ignore",
    )

    # At training time (feature_columns is None) we learn the schema and drop the
    # first dummy of each category as the baseline. At inference time we must NOT
    # drop_first: a single-row input has only one observed category, so
    # ``drop_first`` would discard the only dummy (e.g. encode a VW as the Audi
    # baseline). Instead we keep every dummy and reindex to the training columns,
    # which drops the baseline categories and fills any absent dummy with 0.
    matrix = pd.get_dummies(
        matrix,
        columns=[c for c in config.CATEGORICAL_COLUMNS if c in matrix.columns],
        drop_first=feature_columns is None,
    )

    if feature_columns is not None:
        # Align to the training schema: add absent dummies as 0, drop extras
        # (incl. the baseline-category dummies), and preserve column order.
        matrix = matrix.reindex(columns=feature_columns, fill_value=0)

    return matrix


def split_features_and_target(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.Series]:
    """Create the training matrix ``X`` and target ``y`` from clean data.

    Args:
        df: Cleaned listings DataFrame (output of the preprocessing module).

    Returns:
        A tuple ``(X, y)`` where ``X`` is the encoded feature matrix and ``y``
        is the ``price`` target series.
    """
    engineered = create_features(df)
    y = engineered[config.TARGET_COLUMN]
    X = build_model_matrix(engineered, feature_columns=None)
    return X, y
