"""Model training, evaluation and persistence.

This module reproduces the Linear Regression vs. Random Forest comparison from
the original notebook, then persists the winning Random Forest together with a
JSON metadata sidecar describing the feature schema, imputation defaults and
category options needed at serving time.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from src import config
from src.feature_engineering import split_features_and_target
from src.preprocessing import load_clean_data


@dataclass
class ModelMetrics:
    """Container for the headline regression metrics of a single model."""

    r2: float
    mae: float
    rmse: float

    def as_dict(self) -> dict[str, float]:
        """Return a rounded, JSON-serialisable representation."""
        return {
            "r2": round(self.r2, 4),
            "mae": round(self.mae, 0),
            "rmse": round(self.rmse, 0),
        }


def evaluate(y_true: pd.Series, y_pred: np.ndarray) -> ModelMetrics:
    """Compute R², MAE and RMSE for a set of predictions.

    Args:
        y_true: Ground-truth prices.
        y_pred: Predicted prices.

    Returns:
        A :class:`ModelMetrics` instance.
    """
    return ModelMetrics(
        r2=float(r2_score(y_true, y_pred)),
        mae=float(mean_absolute_error(y_true, y_pred)),
        rmse=float(np.sqrt(mean_squared_error(y_true, y_pred))),
    )


def train_models(
    X: pd.DataFrame,
    y: pd.Series,
) -> tuple[RandomForestRegressor, dict[str, ModelMetrics]]:
    """Train and compare Linear Regression and Random Forest models.

    Args:
        X: Encoded feature matrix.
        y: Target price series.

    Returns:
        A tuple ``(random_forest, metrics)`` where ``metrics`` maps each model
        name to its :class:`ModelMetrics`. The fitted Random Forest is the
        production model.
    """
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=config.TEST_SIZE, random_state=config.RANDOM_STATE
    )

    linear = LinearRegression().fit(X_train, y_train)
    forest = RandomForestRegressor(
        n_estimators=config.RF_N_ESTIMATORS,
        random_state=config.RANDOM_STATE,
        n_jobs=-1,
    ).fit(X_train, y_train)

    metrics = {
        "Linear Regression": evaluate(y_test, linear.predict(X_test)),
        "Random Forest": evaluate(y_test, forest.predict(X_test)),
    }
    return forest, metrics


def build_metadata(
    clean_df: pd.DataFrame,
    feature_columns: list[str],
    metrics: dict[str, ModelMetrics],
) -> dict:
    """Assemble the serving-time metadata sidecar.

    Args:
        clean_df: The cleaned training DataFrame (used for medians/categories).
        feature_columns: Ordered training feature columns.
        metrics: Per-model evaluation metrics.

    Returns:
        A JSON-serialisable metadata dictionary.
    """
    defaults = {
        col: float(clean_df[col].median())
        for col in config.IMPUTED_NUMERIC_COLUMNS
        if col in clean_df.columns
    }
    categories = {
        col: sorted(clean_df[col].dropna().unique().tolist())
        for col in config.CATEGORICAL_COLUMNS
        if col in clean_df.columns
    }
    return {
        "model_type": "RandomForestRegressor",
        "reference_year": config.REFERENCE_YEAR,
        "feature_columns": feature_columns,
        "imputation_defaults": defaults,
        "categories": categories,
        "numeric_ranges": {
            "mileage": [int(clean_df["mileage"].min()), int(clean_df["mileage"].max())],
            "engineSize": [
                float(clean_df["engineSize"].min()),
                float(clean_df["engineSize"].max()),
            ],
            "year": [int(clean_df["year"].min()), int(clean_df["year"].max())],
        },
        "metrics": {name: m.as_dict() for name, m in metrics.items()},
        "n_training_rows": int(len(clean_df)),
    }


def save_artifacts(
    model: RandomForestRegressor,
    metadata: dict,
    model_path: Path = config.MODEL_PATH,
    metadata_path: Path = config.METADATA_PATH,
) -> None:
    """Persist the fitted model (joblib) and its metadata (JSON).

    Args:
        model: The fitted Random Forest.
        metadata: Serving metadata from :func:`build_metadata`.
        model_path: Destination for the ``.pkl`` model file.
        metadata_path: Destination for the ``.json`` metadata file.
    """
    model_path.parent.mkdir(parents=True, exist_ok=True)
    # ``compress=3`` keeps the .pkl comfortably under GitHub's 100 MB limit
    # at a negligible load-time cost.
    joblib.dump(model, model_path, compress=3)
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def run_training_pipeline(verbose: bool = True) -> dict:
    """End-to-end training entry point used by ``train.py``.

    Loads and cleans the data, builds features, trains both models, persists the
    Random Forest plus metadata, and returns the metadata for logging.

    Args:
        verbose: When ``True``, print a human-readable progress/results report.

    Returns:
        The metadata dictionary that was written to disk.
    """
    clean_df = load_clean_data()
    X, y = split_features_and_target(clean_df)
    feature_columns = list(X.columns)

    if verbose:
        print(f"Loaded {len(clean_df):,} clean listings.")
        print(f"Feature matrix: {X.shape[0]:,} rows x {X.shape[1]} features.")
        print("Training models...")

    model, metrics = train_models(X, y)
    metadata = build_metadata(clean_df, feature_columns, metrics)
    save_artifacts(model, metadata)

    if verbose:
        for name, m in metrics.items():
            md = m.as_dict()
            print(f"  {name:<20} R2={md['r2']:.4f}  MAE=£{md['mae']:,.0f}  RMSE=£{md['rmse']:,.0f}")
        print(f"Saved model     -> {config.MODEL_PATH}")
        print(f"Saved metadata  -> {config.METADATA_PATH}")

    return metadata
