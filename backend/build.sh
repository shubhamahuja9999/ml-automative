#!/usr/bin/env bash
# Render build script — upgrades pip first, then forces binary-only installs
# so scikit-learn / numpy / shap never attempt source compilation.
set -e

echo "==> Upgrading pip…"
python -m pip install --upgrade pip

echo "==> Installing requirements (binary wheels only)…"
python -m pip install --only-binary :all: -r requirements.txt
