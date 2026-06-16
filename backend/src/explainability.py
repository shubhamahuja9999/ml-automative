"""Model explainability — global (SHAP summary, importances) and local.

The local explanation turns a single prediction's SHAP contributions into
plain-English bullet points a non-technical user can understand, e.g.
"Low mileage  → +£1,200" rendered as "Low mileage for its age lifts the price".

SHAP is an optional dependency: if it is not installed the global plots are
skipped and local explanations fall back to Random-Forest feature importances,
so the app never crashes on a clean environment.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

from src import config

try:  # SHAP is optional — degrade gracefully when unavailable.
    import shap

    _SHAP_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on environment
    _SHAP_AVAILABLE = False


def shap_available() -> bool:
    """Return ``True`` when the ``shap`` package can be imported."""
    return _SHAP_AVAILABLE


# --------------------------------------------------------------------------- #
# Human-readable labels
# --------------------------------------------------------------------------- #
_FRIENDLY_LABELS: dict[str, str] = {
    "mileage": "Mileage",
    "mileage_per_year": "Annual mileage",
    "car_age": "Vehicle age",
    "engineSize": "Engine size",
    "tax": "Road tax",
    "mpg": "Fuel economy (mpg)",
    "brand_VW": "Volkswagen badge",
    "transmission_Manual": "Manual gearbox",
    "transmission_Semi-Auto": "Semi-automatic gearbox",
    "fuelType_Petrol": "Petrol engine",
    "fuelType_Hybrid": "Hybrid drivetrain",
    "fuelType_Other": "Alternative fuel",
}


def friendly_label(feature: str) -> str:
    """Map a raw model feature name to a user-facing label."""
    return _FRIENDLY_LABELS.get(feature, feature.replace("_", " ").title())


@dataclass
class Contribution:
    """A single feature's signed contribution to one prediction."""

    feature: str
    label: str
    value: float  # signed contribution in £
    sentence: str  # plain-English explanation


def get_feature_importances(
    model, feature_columns: list[str], top_n: int = 15
) -> pd.DataFrame:
    """Return the model's global feature importances as a sorted DataFrame.

    Args:
        model: A fitted tree-based estimator exposing ``feature_importances_``.
        feature_columns: Column names aligned to the model's inputs.
        top_n: Number of top features to keep.

    Returns:
        DataFrame with ``feature``, ``label`` and ``importance`` columns.
    """
    importances = pd.DataFrame(
        {
            "feature": feature_columns,
            "label": [friendly_label(f) for f in feature_columns],
            "importance": model.feature_importances_,
        }
    )
    return importances.sort_values("importance", ascending=False).head(top_n)


def save_feature_importance_plot(
    model,
    feature_columns: list[str],
    output_path: Path = config.FEATURE_IMPORTANCE_PLOT,
    top_n: int = 15,
) -> Path:
    """Render and save a horizontal bar chart of feature importances.

    Args:
        model: Fitted tree-based model.
        feature_columns: Column names aligned to the model.
        output_path: Where to write the PNG.
        top_n: Number of features to display.

    Returns:
        The path the figure was written to.
    """
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    top = get_feature_importances(model, feature_columns, top_n).iloc[::-1]

    fig, ax = plt.subplots(figsize=(9, 6))
    ax.barh(top["label"], top["importance"], color="#475b4e")
    ax.set_title(f"Top {top_n} Feature Importances — Random Forest", fontweight="bold")
    ax.set_xlabel("Importance")
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    fig.tight_layout()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return output_path


def save_shap_summary_plot(
    model,
    X_background: pd.DataFrame,
    output_path: Path = config.SHAP_SUMMARY_PLOT,
    max_samples: int = 500,
) -> Path | None:
    """Render and save a SHAP beeswarm summary plot for the model.

    Args:
        model: Fitted tree-based model.
        X_background: Representative feature matrix to explain.
        output_path: Where to write the PNG.
        max_samples: Cap on rows sampled for the (expensive) SHAP computation.

    Returns:
        The output path, or ``None`` when SHAP is unavailable.
    """
    if not _SHAP_AVAILABLE:
        return None

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    sample = X_background
    if len(X_background) > max_samples:
        sample = X_background.sample(max_samples, random_state=config.RANDOM_STATE)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(sample)

    plt.figure()
    labels = [friendly_label(c) for c in sample.columns]
    shap.summary_plot(shap_values, sample, feature_names=labels, show=False)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=120, bbox_inches="tight")
    plt.close()
    return output_path


@lru_cache(maxsize=1)
def _baseline_medians(feature_columns: tuple[str, ...]) -> pd.Series:
    """Return the training-set median of each model-matrix column (cached).

    Loaded lazily from the committed datasets so the ablation explainer needs
    no external state. Aligned to ``feature_columns``.
    """
    from src.feature_engineering import build_model_matrix, create_features
    from src.preprocessing import load_clean_data

    matrix = build_model_matrix(
        create_features(load_clean_data()), feature_columns=list(feature_columns)
    )
    return matrix.median()


def _ablation_contributions(model, X_row: pd.DataFrame) -> np.ndarray:
    """Signed per-feature contributions via single-feature ablation.

    For each feature, the contribution is ``predict(row) − predict(row with
    that feature reset to its training median)`` — a SHAP-free local attribution
    that is per-prediction and correctly signed.

    Args:
        model: Fitted tree-based model.
        X_row: A single-row feature matrix aligned to the model's columns.

    Returns:
        A 1-D array of signed contributions, one per column of ``X_row``.
    """
    try:
        baseline = _baseline_medians(tuple(X_row.columns))
    except Exception:  # pragma: no cover - data unavailable: degrade gracefully
        return model.feature_importances_ * 1000.0

    full = float(model.predict(X_row)[0])
    values = np.empty(len(X_row.columns), dtype=float)
    for i, col in enumerate(X_row.columns):
        probe = X_row.copy()
        probe.iloc[0, i] = baseline[col]
        values[i] = full - float(model.predict(probe)[0])
    return values


def explain_prediction(
    model,
    X_row: pd.DataFrame,
    top_n: int = 5,
) -> list[Contribution]:
    """Explain a single prediction as ranked, plain-English contributions.

    Uses SHAP when available (exact, signed £ contributions); otherwise falls
    back to importance-weighted directional heuristics.

    Args:
        model: Fitted tree-based model.
        X_row: A single-row feature matrix aligned to the model's columns.
        top_n: Number of contributions to return.

    Returns:
        A list of :class:`Contribution`, largest absolute impact first.
    """
    if _SHAP_AVAILABLE:
        explainer = shap.TreeExplainer(model)
        values = explainer.shap_values(X_row)[0]
    else:
        # Dependency-free fallback: per-feature ablation against the training
        # median. Each feature's contribution is how much the prediction moves
        # when that feature alone is reset to its typical (median) value.
        values = _ablation_contributions(model, X_row)

    contributions: list[Contribution] = []
    for feature, value in zip(X_row.columns, values):
        raw_value = X_row.iloc[0][feature]
        contributions.append(
            Contribution(
                feature=feature,
                label=friendly_label(feature),
                value=float(value),
                sentence=_describe(feature, raw_value, float(value)),
            )
        )

    contributions.sort(key=lambda c: abs(c.value), reverse=True)
    return contributions[:top_n]


def _describe(feature: str, raw_value: float, contribution: float) -> str:
    """Build a single plain-English sentence for one contribution.

    Args:
        feature: Raw model feature name.
        raw_value: The feature's value for this vehicle.
        contribution: Signed £ impact on the predicted price.

    Returns:
        A sentence such as "Low mileage lifts the estimate by £1,240".
    """
    direction = "lifts" if contribution >= 0 else "lowers"
    amount = f"£{abs(contribution):,.0f}"
    present = bool(raw_value)

    # Numeric features describe their magnitude; one-hot features describe the
    # vehicle truthfully depending on whether the attribute is present (1) or
    # absent (0) — so a diesel car is never labelled "Petrol engine".
    numeric = {
        "car_age": "Newer vehicle" if raw_value <= 3 else "Older vehicle",
        "mileage": "Low mileage" if raw_value <= 30_000 else "High mileage",
        "mileage_per_year": "Light annual use"
        if raw_value <= 12_000
        else "Heavy annual use",
        "engineSize": "Larger engine" if raw_value >= 2.0 else "Smaller engine",
        "tax": "Higher road tax" if raw_value >= 150 else "Lower road tax",
        "mpg": "Strong fuel economy" if raw_value >= 55 else "Modest fuel economy",
    }
    onehot = {  # (label when present, label when absent)
        "brand_VW": ("Volkswagen badge", "Audi premium"),
        "transmission_Manual": ("Manual gearbox", "Automatic / semi-auto gearbox"),
        "transmission_Semi-Auto": ("Semi-automatic gearbox", "Manual / automatic gearbox"),
        "fuelType_Petrol": ("Petrol engine", "Non-petrol fuel"),
        "fuelType_Hybrid": ("Hybrid drivetrain", "Non-hybrid drivetrain"),
        "fuelType_Other": ("Alternative fuel", "Mainstream fuel type"),
    }

    if feature in numeric:
        descriptor = numeric[feature]
    elif feature in onehot:
        descriptor = onehot[feature][0] if present else onehot[feature][1]
    else:
        descriptor = friendly_label(feature)

    return f"{descriptor} {direction} the estimate by {amount}."
