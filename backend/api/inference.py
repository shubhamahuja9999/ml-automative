"""Inference service: valuation, market positioning and explanations.

Wraps the existing prediction pipeline (``predict.predict_price``) and the
reference dataset to produce API-ready response objects. The model, metadata
and market aggregates are loaded once and cached for the process lifetime.
"""

from __future__ import annotations

from functools import lru_cache

import pandas as pd

from src import config
from src.explainability import shap_available
from src.feature_engineering import create_features
from src.preprocessing import load_clean_data
from predict import PredictionResult, load_model, predict_price

from api import schemas

REF_YEAR = config.REFERENCE_YEAR

# Market-position palette (graphite / silver / amber identity).
_STEEL = "#8a9bb5"
_AMBER = "#ff9e2c"
_GOLD = "#ffd27a"


@lru_cache(maxsize=1)
def _market_frame() -> pd.DataFrame:
    """Cleaned + feature-engineered reference market data (cached)."""
    return create_features(load_clean_data())


def warm_up() -> None:
    """Eagerly load model + market data so the first request is fast."""
    load_model()
    _market_frame()


def value_index(price: float) -> float:
    """Percentile (0-100) of ``price`` within the full market."""
    df = _market_frame()
    return float((df["price"] < price).mean() * 100)


def market_position(price: float, vehicle: schemas.VehicleInput) -> schemas.MarketPosition:
    """Classify a valuation against comparable (same brand, similar age) listings."""
    df = _market_frame()
    age = REF_YEAR - vehicle.year
    comp = df[(df["brand"] == vehicle.brand) & (df["car_age"].between(age - 2, age + 2))]
    if len(comp) < 20:
        comp = df[df["brand"] == vehicle.brand]
    median = float(comp["price"].median()) if len(comp) else price
    ratio = price / median if median else 1.0
    pos = max(3.0, min(97.0, (ratio - 0.75) / 0.5 * 100))

    if ratio < 0.92:
        label, color = "Below Market", _STEEL
    elif ratio <= 1.08:
        label, color = "Fair Value", _AMBER
    else:
        label, color = "Premium", _GOLD

    return schemas.MarketPosition(
        label=label, color=color, positionPct=round(pos, 1),
        ratio=round(ratio, 4), comparableMedian=round(median, 0),
    )


def _short_label(sentence: str) -> str:
    """Extract the truthful descriptor that opens an explanation sentence.

    e.g. "Audi premium lifts the estimate by £1,813." -> "Audi premium".
    """
    for marker in (" lifts the estimate", " lowers the estimate"):
        if marker in sentence:
            return sentence.split(marker)[0].strip()
    return sentence


def _to_prediction(vehicle: schemas.VehicleInput, res: PredictionResult) -> schemas.PredictionResponse:
    """Assemble a :class:`PredictionResponse` from a raw prediction result."""
    return schemas.PredictionResponse(
        price=round(res.price, 0),
        priceLabel=res.price_gbp,
        lower=round(res.lower, 0),
        upper=round(res.upper, 0),
        confidence=round(res.confidence, 4),
        valueIndex=round(value_index(res.price), 1),
        marketPosition=market_position(res.price, vehicle),
        vehicle=vehicle,
    )


def predict(vehicle: schemas.VehicleInput) -> schemas.PredictionResponse:
    """Value a single vehicle (no explanation)."""
    model, metadata = load_model()
    res = predict_price(vehicle.model_dump(), model=model, metadata=metadata, explain=False)
    return _to_prediction(vehicle, res)


def explain(vehicle: schemas.VehicleInput) -> schemas.ExplainResponse:
    """Value a single vehicle and return ranked, signed value drivers."""
    model, metadata = load_model()
    res = predict_price(vehicle.model_dump(), model=model, metadata=metadata, explain=True)
    base = _to_prediction(vehicle, res)
    drivers = [
        schemas.Driver(
            feature=c.feature, label=_short_label(c.sentence), value=round(c.value, 0),
            direction="up" if c.value >= 0 else "down", sentence=c.sentence,
        )
        for c in res.explanations
    ]
    return schemas.ExplainResponse(
        **base.model_dump(),
        drivers=drivers,
        method="shap" if shap_available() else "ablation",
    )


def compare(req: schemas.CompareRequest) -> schemas.CompareResponse:
    """Value two vehicles and quantify the gap between them."""
    a = explain(req.vehicleA)
    b = explain(req.vehicleB)
    gap = b.price - a.price
    return schemas.CompareResponse(
        a=a, b=b,
        gap=round(abs(gap), 0),
        gapPct=round(abs(gap) / a.price * 100, 1) if a.price else 0.0,
        winner="B" if gap >= 0 else "A",
    )


@lru_cache(maxsize=1)
def metadata_payload() -> schemas.MetaResponse:
    """Reference data for the UI: dropdowns, ranges, metrics and chart data."""
    _, metadata = load_model()
    df = _market_frame()

    depreciation = (
        df.groupby("car_age")["price"].median().reset_index()
        .query("car_age >= 0 and car_age <= 20")
    )
    dep_points = [
        schemas.DepreciationPoint(age=int(r.car_age), price=round(float(r.price), 0))
        for r in depreciation.itertuples()
    ]
    sample = df.sample(min(400, len(df)), random_state=config.RANDOM_STATE)
    scatter = [
        schemas.ScatterPoint(mileage=float(r.mileage), price=float(r.price), brand=str(r.brand))
        for r in sample.itertuples()
    ]

    return schemas.MetaResponse(
        categories=metadata.get("categories", {}),
        numericRanges=metadata.get("numeric_ranges", {}),
        metrics=metadata.get("metrics", {}),
        referenceYear=metadata.get("reference_year", REF_YEAR),
        trainingRows=metadata.get("n_training_rows", len(df)),
        shapEnabled=shap_available(),
        depreciation=dep_points,
        scatter=scatter,
    )
