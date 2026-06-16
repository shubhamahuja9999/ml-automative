"""Central configuration: paths, schema and modelling constants.

Keeping every path and "magic" constant in one module means the training
pipeline, the batch predictor and the Streamlit app never disagree about
where data lives or how features are built.
"""

from __future__ import annotations

from pathlib import Path

# --------------------------------------------------------------------------- #
# Filesystem layout
# --------------------------------------------------------------------------- #
PROJECT_ROOT: Path = Path(__file__).resolve().parents[1]

DATA_DIR: Path = PROJECT_ROOT / "data"
MODELS_DIR: Path = PROJECT_ROOT / "models"
ASSETS_DIR: Path = PROJECT_ROOT / "assets"

VW_CSV: Path = DATA_DIR / "vw.csv"
AUDI_CSV: Path = DATA_DIR / "audi.csv"

MODEL_PATH: Path = MODELS_DIR / "random_forest.pkl"
METADATA_PATH: Path = MODELS_DIR / "model_metadata.json"
SHAP_SUMMARY_PLOT: Path = ASSETS_DIR / "shap_summary.png"
FEATURE_IMPORTANCE_PLOT: Path = ASSETS_DIR / "feature_importance.png"

# --------------------------------------------------------------------------- #
# Data schema
# --------------------------------------------------------------------------- #
# The reference year is the snapshot the dataset was captured at; ``car_age``
# is measured relative to it so that results stay reproducible over time.
REFERENCE_YEAR: int = 2020

# Columns dropped before modelling: identifiers / leakage / redundant-with-age.
DROP_COLUMNS: list[str] = ["model", "year", "price"]

# Categorical columns that are one-hot encoded (``drop_first=True``).
CATEGORICAL_COLUMNS: list[str] = ["transmission", "fuelType", "brand"]

# Numeric columns the end user is not asked for in the UI; at inference time
# they are imputed with the training-set median (persisted in the metadata).
IMPUTED_NUMERIC_COLUMNS: list[str] = ["tax", "mpg"]

TARGET_COLUMN: str = "price"

# --------------------------------------------------------------------------- #
# Cleaning thresholds (mirrors the original notebook validation)
# --------------------------------------------------------------------------- #
MIN_PRICE: float = 500.0
MAX_PRICE: float = 100_000.0
MIN_ENGINE_SIZE: float = 0.0  # strictly greater-than is applied in the cleaner

# --------------------------------------------------------------------------- #
# Training hyper-parameters
# --------------------------------------------------------------------------- #
RANDOM_STATE: int = 42
TEST_SIZE: float = 0.2
RF_N_ESTIMATORS: int = 100
