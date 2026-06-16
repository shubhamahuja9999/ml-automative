"""Vehicle Intelligence API — FastAPI application.

REST endpoints backing the Next.js dashboard:

    GET  /                 service banner
    GET  /health           liveness probe
    GET  /api/meta         dropdowns, ranges, metrics and chart data
    POST /api/predict      value one vehicle
    POST /api/explain      value one vehicle + ranked value drivers (SHAP)
    POST /api/compare      value two vehicles side by side

Deploy on Railway / Render with:
    uvicorn api.main:app --host 0.0.0.0 --port $PORT
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import inference, schemas


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Warm the model + market caches at boot."""
    inference.warm_up()
    yield


app = FastAPI(
    title="Vehicle Intelligence API",
    version="2.0.0",
    description="Resale valuation, market positioning and SHAP explanations "
    "for used Volkswagen & Audi vehicles.",
    lifespan=lifespan,
)

# CORS — allow the Vercel frontend (comma-separated origins) or all in dev.
_origins = os.getenv("FRONTEND_ORIGIN", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
def root() -> dict:
    """Service banner."""
    return {"service": "Vehicle Intelligence API", "version": app.version, "docs": "/docs"}


@app.get("/health", tags=["meta"])
def health() -> dict:
    """Liveness probe for Railway / Render health checks."""
    return {"status": "ok"}


@app.get("/api/meta", response_model=schemas.MetaResponse, tags=["meta"])
def meta() -> schemas.MetaResponse:
    """Reference data for populating the UI."""
    return inference.metadata_payload()


@app.post("/api/predict", response_model=schemas.PredictionResponse, tags=["valuation"])
def predict(vehicle: schemas.VehicleInput) -> schemas.PredictionResponse:
    """Value a single vehicle."""
    return inference.predict(vehicle)


@app.post("/api/explain", response_model=schemas.ExplainResponse, tags=["valuation"])
def explain(vehicle: schemas.VehicleInput) -> schemas.ExplainResponse:
    """Value a single vehicle and return its ranked value drivers."""
    return inference.explain(vehicle)


@app.post("/api/compare", response_model=schemas.CompareResponse, tags=["valuation"])
def compare(req: schemas.CompareRequest) -> schemas.CompareResponse:
    """Value two vehicles side by side and quantify the gap."""
    return inference.compare(req)
