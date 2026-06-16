"""Train the vehicle valuation model and persist artifacts.

Usage:
    python train.py            # train, evaluate, save model + metadata + plots
    python train.py --quiet    # suppress the progress/results report
    python train.py --no-plots # skip generating the assets/ visualisations
"""

from __future__ import annotations

import argparse

from src import config
from src.explainability import (
    save_feature_importance_plot,
    save_shap_summary_plot,
    shap_available,
)
from src.feature_engineering import split_features_and_target
from src.model_training import run_training_pipeline
from src.preprocessing import load_clean_data
from predict import load_model


def _generate_plots() -> None:
    """Regenerate the global explainability assets from the saved model."""
    # Clear the cached model so freshly-trained artifacts are picked up.
    load_model.cache_clear()
    model, _ = load_model()
    X, _ = split_features_and_target(load_clean_data())

    importance_path = save_feature_importance_plot(model, list(X.columns))
    print(f"Saved feature importance plot -> {importance_path}")

    if shap_available():
        shap_path = save_shap_summary_plot(model, X)
        print(f"Saved SHAP summary plot       -> {shap_path}")
    else:
        print("SHAP not installed — skipping SHAP summary plot "
              "(install with `pip install shap`).")


def main() -> None:
    """Parse arguments and run the training pipeline."""
    parser = argparse.ArgumentParser(description="Train the valuation model.")
    parser.add_argument("--quiet", action="store_true", help="Suppress output.")
    parser.add_argument("--no-plots", action="store_true", help="Skip plots.")
    args = parser.parse_args()

    run_training_pipeline(verbose=not args.quiet)

    if not args.no_plots:
        _generate_plots()

    print(f"\nDone. Artifacts written to {config.MODELS_DIR} and {config.ASSETS_DIR}.")


if __name__ == "__main__":
    main()
