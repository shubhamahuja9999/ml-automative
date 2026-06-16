"""Pydantic request/response models for the Vehicle Intelligence API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class VehicleInput(BaseModel):
    """A single vehicle's attributes as submitted from the UI."""

    brand: str = Field(..., examples=["Audi"])
    year: int = Field(..., ge=1990, le=2025, examples=[2018])
    mileage: float = Field(..., ge=0, examples=[30000])
    engineSize: float = Field(..., gt=0, le=10, examples=[2.0])
    fuelType: str = Field(..., examples=["Petrol"])
    transmission: str = Field(..., examples=["Automatic"])

    model_config = {
        "json_schema_extra": {
            "example": {
                "brand": "Audi",
                "year": 2018,
                "mileage": 30000,
                "engineSize": 2.0,
                "fuelType": "Petrol",
                "transmission": "Automatic",
            }
        }
    }


class Driver(BaseModel):
    """One feature's contribution to a prediction (SHAP or ablation)."""

    feature: str
    label: str
    value: float
    direction: str  # "up" | "down"
    sentence: str


class MarketPosition(BaseModel):
    """Where a valuation sits versus comparable listings."""

    label: str  # "Below Market" | "Fair Value" | "Premium"
    color: str
    positionPct: float
    ratio: float
    comparableMedian: float


class PredictionResponse(BaseModel):
    """The full valuation for one vehicle."""

    price: float
    priceLabel: str
    lower: float
    upper: float
    confidence: float
    valueIndex: float
    marketPosition: MarketPosition
    vehicle: VehicleInput


class ExplainResponse(PredictionResponse):
    """A valuation plus its ranked value drivers."""

    drivers: list[Driver]
    method: str  # "shap" | "ablation"


class CompareRequest(BaseModel):
    """Two vehicles to value side by side."""

    vehicleA: VehicleInput
    vehicleB: VehicleInput


class CompareResponse(BaseModel):
    """Side-by-side comparison result."""

    a: ExplainResponse
    b: ExplainResponse
    gap: float
    gapPct: float
    winner: str  # "A" | "B"


class DepreciationPoint(BaseModel):
    age: int
    price: float


class ScatterPoint(BaseModel):
    mileage: float
    price: float
    brand: str


class MetaResponse(BaseModel):
    """Reference data for populating the UI (dropdowns, ranges, charts)."""

    categories: dict[str, list[str]]
    numericRanges: dict[str, list[float]]
    metrics: dict[str, dict[str, float]]
    referenceYear: int
    trainingRows: int
    shapEnabled: bool
    depreciation: list[DepreciationPoint]
    scatter: list[ScatterPoint]
