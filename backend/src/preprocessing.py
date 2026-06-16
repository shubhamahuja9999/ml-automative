"""Raw data loading and cleaning.

The functions here turn the two source CSVs (``vw.csv`` / ``audi.csv``) into a
single, validated :class:`pandas.DataFrame`. They are deliberately free of any
modelling concerns so they can be reused for analysis, training and tests.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from src import config


def load_raw_data(
    vw_path: Path = config.VW_CSV,
    audi_path: Path = config.AUDI_CSV,
) -> pd.DataFrame:
    """Load the VW and Audi listings and combine them with a ``brand`` column.

    Args:
        vw_path: Path to the Volkswagen listings CSV.
        audi_path: Path to the Audi listings CSV.

    Returns:
        A single DataFrame containing every listing with an added ``brand``
        column (``"VW"`` or ``"Audi"``).

    Raises:
        FileNotFoundError: If either CSV is missing.
    """
    for path in (vw_path, audi_path):
        if not Path(path).exists():
            raise FileNotFoundError(
                f"Expected dataset not found: {path}. "
                "Place vw.csv and audi.csv inside the data/ directory."
            )

    vw = pd.read_csv(vw_path)
    audi = pd.read_csv(audi_path)

    combined = pd.concat(
        [vw.assign(brand="VW"), audi.assign(brand="Audi")],
        ignore_index=True,
    )
    return _strip_string_columns(combined)


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Apply the validated cleaning rules from the original analysis.

    Rows are kept only when they have a positive engine size and a plausible
    price (between :data:`config.MIN_PRICE` and :data:`config.MAX_PRICE`).

    Args:
        df: Raw combined listings DataFrame.

    Returns:
        A new, filtered DataFrame (the input is not mutated).
    """
    mask = (
        (df["engineSize"] > config.MIN_ENGINE_SIZE)
        & (df["price"] >= config.MIN_PRICE)
        & (df["price"] <= config.MAX_PRICE)
    )
    cleaned = df.loc[mask].copy()

    # Defensive validation — mirrors the notebook's assertions.
    assert cleaned["engineSize"].min() > config.MIN_ENGINE_SIZE
    assert cleaned["price"].min() >= config.MIN_PRICE
    assert cleaned["price"].max() <= config.MAX_PRICE

    return cleaned


def load_clean_data(
    vw_path: Path = config.VW_CSV,
    audi_path: Path = config.AUDI_CSV,
) -> pd.DataFrame:
    """Convenience wrapper: load both CSVs and return a cleaned DataFrame."""
    return clean_data(load_raw_data(vw_path, audi_path))


def _strip_string_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Trim leading/trailing whitespace from object (string) columns.

    The source CSVs contain leading spaces in some text fields (e.g. the model
    name ``" T-Roc"``); stripping them keeps categorical encoding consistent.
    """
    string_cols = df.select_dtypes(include="object").columns
    for col in string_cols:
        df[col] = df[col].str.strip()
    return df
