"""
preprocessing.py
Feature engineering + preprocessing pipeline for the PaySim fraud model.
Used for model training, offline validation, and real-time transaction inference.
"""

import os
import json
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
import joblib

# Raw PaySim column mappings & constants
RAW_DROP_COLS = [
    "isFraud", "nameOrig", "nameDest", "isFlaggedFraud",
]

VALID_TX_TYPES = ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]


def load_encoder(path: str = "type_encoder.pkl"):
    """Load OneHotEncoder instance from disk."""
    if not os.path.isabs(path) and not os.path.exists(path):
        alt_paths = [
            os.path.join(os.path.dirname(__file__), path),
            os.path.join(os.path.dirname(__file__), "..", path),
            os.path.join("backend", path)
        ]
        for p in alt_paths:
            if os.path.exists(p):
                path = p
                break
    return joblib.load(path)


def load_metadata(path: str = "fraud_model_metadata.json") -> dict:
    """Load model metadata containing feature order and threshold."""
    if not os.path.isabs(path) and not os.path.exists(path):
        alt_paths = [
            os.path.join(os.path.dirname(__file__), path),
            os.path.join(os.path.dirname(__file__), "..", path),
            os.path.join("backend", path)
        ]
        for p in alt_paths:
            if os.path.exists(p):
                path = p
                break
    with open(path, "r") as f:
        return json.load(f)


def build_inference_features(
    step: int,
    amount: float,
    tx_type: str,
    old_bal_orig: float,
    new_bal_orig: float,
    old_bal_dest: float,
    new_bal_dest: float,
    feature_order: List[str],
    encoder=None,
) -> pd.DataFrame:
    """
    Construct the exact 12-feature vector for real-time inference matching the trained XGBoost model.
    """
    tx_type_upper = str(tx_type).upper()
    if tx_type_upper not in VALID_TX_TYPES:
        raise ValueError(f"Invalid tx_type '{tx_type}'. Must be one of {VALID_TX_TYPES}")

    balance_diff_old = float(old_bal_orig) - float(new_bal_orig)
    balance_diff_new = float(new_bal_dest) - float(old_bal_dest)
    money_movement = float(amount)
    balance_diff_error_old = float(old_bal_orig) - float(amount) - float(new_bal_orig)
    balance_diff_error_new = float(old_bal_dest) + float(amount) - float(new_bal_dest)

    # One-hot encoded transaction types
    if encoder is not None:
        type_df = pd.DataFrame([{"type": tx_type_upper}])
        encoded_arr = encoder.transform(type_df[["type"]])
        if hasattr(encoded_arr, "toarray"):
            encoded_arr = encoded_arr.toarray()
        encoded_cols = encoder.get_feature_names_out(["type"])
        type_dict = dict(zip(encoded_cols, encoded_arr[0]))
    else:
        type_dict = {
            f"type_{t}": 1.0 if t == tx_type_upper else 0.0
            for t in VALID_TX_TYPES
        }

    row = {
        "step": int(step),
        "amount": float(amount),
        "balance_diff_old": balance_diff_old,
        "balance_diff_new": balance_diff_new,
        "money_movement": money_movement,
        "balance_diff_error_old": balance_diff_error_old,
        "balance_diff_error_new": balance_diff_error_new,
        **type_dict,
    }

    df = pd.DataFrame([row])
    return df[feature_order]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Batch feature engineering for tabular datasets."""
    df = df.copy()
    
    # Check if raw names exist
    if "oldbalanceOrg" in df.columns and "newbalanceOrig" in df.columns:
        df["balance_diff_old"] = df["oldbalanceOrg"] - df["newbalanceOrig"]
        df["balance_diff_error_old"] = df["oldbalanceOrg"] - df["amount"] - df["newbalanceOrig"]
    if "oldbalanceDest" in df.columns and "newbalanceDest" in df.columns:
        df["balance_diff_new"] = df["newbalanceDest"] - df["oldbalanceDest"]
        df["balance_diff_error_new"] = df["oldbalanceDest"] + df["amount"] - df["newbalanceDest"]
    if "amount" in df.columns and "money_movement" not in df.columns:
        df["money_movement"] = df["amount"]

    cols_to_drop = [c for c in RAW_DROP_COLS if c in df.columns]
    df = df.drop(columns=cols_to_drop)
    return df


def encode_type(df: pd.DataFrame, encoder) -> pd.DataFrame:
    """Encode transaction type column using provided OneHotEncoder."""
    df = df.copy()
    encoded = encoder.transform(df[["type"]])
    encoded_cols = encoder.get_feature_names_out(["type"])
    encoded_df = pd.DataFrame(
        encoded.toarray() if hasattr(encoded, "toarray") else encoded,
        columns=encoded_cols,
        index=df.index,
    )
    df = pd.concat([df.drop(columns=["type"]), encoded_df], axis=1)
    return df


def preprocess(df: pd.DataFrame, encoder, feature_order: list) -> pd.DataFrame:
    """Full preprocessing pipeline for DataFrame."""
    df = engineer_features(df)
    if "type" in df.columns:
        df = encode_type(df, encoder)
    missing = set(feature_order) - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns after preprocessing: {missing}")
    return df[feature_order]
