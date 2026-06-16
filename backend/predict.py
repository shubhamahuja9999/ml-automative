"""Reusable prediction pipeline + command-line interface.

Public API (imported by ``app.py`` and usable from scripts/tests):

    load_model()       -> (model, metadata)
    preprocess_input() -> normalised single-row DataFrame
    create_features()  -> re-exported from feature_engineering
    predict_price()    -> PredictionResult

Run from the shell:

    python predict.py --brand Audi --year 2018 --mileage 30000 \
        --engine-size 2.0 --fuel-type Petrol --transmission Automatic
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from src import config
from src.explainability import Contribution, explain_prediction
from src.feature_engineering import build_model_matrix, create_features

__all__ = [
    "load_model",
    "preprocess_input",
    "create_features",
    "predict_price",
    "PredictionResult",
]


@dataclass
class PredictionResult:
    """The full result of a single valuation request."""

    price: float
    lower: float
    upper: float
    confidence: float  # 0-1, higher = tighter spread across the forest
    explanations: list[Contribution]

    @property
    def price_gbp(self) -> str:
        """Predicted price formatted as ``£12,345``."""
        return f"£{self.price:,.0f}"


@lru_cache(maxsize=1)
def load_model(
    model_path: str | Path = config.MODEL_PATH,
    metadata_path: str | Path = config.METADATA_PATH,
) -> tuple[object, dict]:
    """Load the trained model and its serving metadata (memoised).

    Args:
        model_path: Path to the joblib ``.pkl`` model file.
        metadata_path: Path to the JSON metadata sidecar.

    Returns:
        A tuple ``(model, metadata)``.

    Raises:
        FileNotFoundError: If the model or metadata file is missing — train the
            model first with ``python train.py``.
    """
    model_path, metadata_path = Path(model_path), Path(metadata_path)
    if not model_path.exists() or not metadata_path.exists():
        raise FileNotFoundError(
            "Model artifacts not found. Run `python train.py` to create "
            f"{model_path.name} and {metadata_path.name} in the models/ folder."
        )

    model = joblib.load(model_path)
    metadata = json.loads(Path(metadata_path).read_text(encoding="utf-8"))
    return model, metadata


def preprocess_input(
    raw_input: dict,
    metadata: dict,
) -> pd.DataFrame:
    """Normalise raw UI/CLI input into a single-row DataFrame.

    User-facing inputs (brand, year, mileage, engine size, fuel type,
    transmission) are combined with median-imputed values for the columns the
    UI does not collect (``tax``, ``mpg``), producing a row with the same raw
    schema the training pipeline saw before feature engineering.

    Args:
        raw_input: Mapping with keys ``brand``, ``year``, ``mileage``,
            ``engineSize``, ``fuelType`` and ``transmission``.
        metadata: Serving metadata from :func:`load_model`.

    Returns:
        A one-row DataFrame ready for :func:`create_features`.
    """
    defaults = metadata.get("imputation_defaults", {})
    record = {
        "brand": raw_input["brand"],
        "year": int(raw_input["year"]),
        "mileage": float(raw_input["mileage"]),
        "engineSize": float(raw_input["engineSize"]),
        "fuelType": raw_input["fuelType"],
        "transmission": raw_input["transmission"],
    }
    # Impute columns the model needs but the user is not asked for.
    for col in config.IMPUTED_NUMERIC_COLUMNS:
        record[col] = float(raw_input.get(col, defaults.get(col, 0.0)))

    return pd.DataFrame([record])


def predict_price(
    raw_input: dict,
    model: object | None = None,
    metadata: dict | None = None,
    explain: bool = True,
) -> PredictionResult:
    """Predict a resale price (with a confidence band) for one vehicle.

    Args:
        raw_input: Raw user inputs (see :func:`preprocess_input`).
        model: Optional pre-loaded model; loaded on demand when ``None``.
        metadata: Optional pre-loaded metadata; loaded on demand when ``None``.
        explain: When ``True``, attach the top per-prediction explanations.

    Returns:
        A :class:`PredictionResult` with the point estimate, an interval derived
        from the spread of the individual trees, a confidence score and (when
        requested) plain-English explanations.
    """
    if model is None or metadata is None:
        model, metadata = load_model()

    feature_columns = metadata["feature_columns"]
    row = preprocess_input(raw_input, metadata)
    engineered = create_features(row)
    X = build_model_matrix(engineered, feature_columns=feature_columns)

    # Point estimate.
    price = float(model.predict(X)[0])

    # Uncertainty: spread of predictions across the individual trees.
    tree_preds = np.array([tree.predict(X.values)[0] for tree in model.estimators_])
    std = float(tree_preds.std())
    lower, upper = price - 1.96 * std, price + 1.96 * std

    # Confidence: tighter relative spread -> higher confidence (bounded 0-1).
    rel_spread = std / price if price else 1.0
    confidence = float(max(0.0, min(1.0, 1.0 - rel_spread)))

    explanations = explain_prediction(model, X) if explain else []

    return PredictionResult(
        price=price,
        lower=max(0.0, lower),
        upper=upper,
        confidence=confidence,
        explanations=explanations,
    )


def _build_cli() -> argparse.ArgumentParser:
    """Construct the command-line argument parser."""
    parser = argparse.ArgumentParser(
        description="Predict the resale price of a used VW or Audi.",
    )
    parser.add_argument("--brand", required=True, choices=["VW", "Audi"])
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--mileage", required=True, type=float)
    parser.add_argument("--engine-size", required=True, type=float, dest="engineSize")
    parser.add_argument("--fuel-type", required=True, dest="fuelType")
    parser.add_argument("--transmission", required=True)
    parser.add_argument(
        "--no-explain", action="store_true", help="Skip the explanation breakdown."
    )
    return parser


def main() -> None:
    """CLI entry point: parse args, predict and print a readable report."""
    args = _build_cli().parse_args()
    raw_input = {
        "brand": args.brand,
        "year": args.year,
        "mileage": args.mileage,
        "engineSize": args.engineSize,
        "fuelType": args.fuelType,
        "transmission": args.transmission,
    }
    result = predict_price(raw_input, explain=not args.no_explain)

    print(f"\nEstimated resale value: {result.price_gbp}")
    print(f"Likely range:           £{result.lower:,.0f} – £{result.upper:,.0f}")
    print(f"Confidence:             {result.confidence:.0%}")
    if result.explanations:
        print("\nWhy this valuation:")
        for c in result.explanations:
            print(f"  • {c.sentence}")


if __name__ == "__main__":
    main()
