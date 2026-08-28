"""
Fraud Inference Service
Wraps the existing XGBoost PaySim model without modifying it.
Builds the 12-feature vector directly with correct column names from metadata.
"""

import json
import logging
import os
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

from app.config import settings
from preprocessing import build_inference_features, load_encoder, load_metadata, VALID_TX_TYPES

logger = logging.getLogger(__name__)


class FraudInferenceService:
    def __init__(self, model_path: Optional[str] = None,
                 encoder_path: Optional[str] = None,
                 metadata_path: Optional[str] = None):
        model_path = model_path or settings.MODEL_PATH
        encoder_path = encoder_path or settings.ENCODER_PATH
        metadata_path = metadata_path or settings.METADATA_PATH

        # Load XGBoost model
        self.booster = xgb.Booster()
        self.booster.load_model(model_path)
        logger.info(f"XGBoost model loaded from {model_path}")

        # Load type encoder
        self.encoder = load_encoder(encoder_path)
        logger.info(f"Type encoder loaded from {encoder_path}")

        # Load metadata
        self.metadata = load_metadata(metadata_path)

        self.feature_order: List[str] = self.metadata["feature_order"]
        self.threshold: float = self.metadata.get("threshold", settings.MODEL_FRAUD_THRESHOLD)  # 0.97
        logger.info(f"Model threshold: {self.threshold}, features: {self.feature_order}")


        # Try SHAP
        self.shap_available = False
        try:
            import shap
            self.explainer = shap.TreeExplainer(self.booster)
            self.shap_available = True
            logger.info("SHAP explainer initialized successfully")
        except Exception as e:
            logger.warning(f"SHAP not available: {e}. Falling back to feature importance.")

    def predict(
        self,
        step: int,
        amount: float,
        tx_type: str,
        old_bal_orig: float,
        new_bal_orig: float,
        old_bal_dest: float,
        new_bal_dest: float,
    ) -> Dict:
        """
        Run fraud prediction. Returns probability and optional SHAP explanation.

        Args:
            step: PaySim time step (1-744)
            amount: Transaction amount
            tx_type: One of CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER
            old_bal_orig: Sender's balance before transaction
            new_bal_orig: Sender's balance after transaction
            old_bal_dest: Receiver's balance before transaction
            new_bal_dest: Receiver's balance after transaction
        """
        if tx_type not in VALID_TX_TYPES:
            raise ValueError(f"Invalid tx_type '{tx_type}'. Must be one of {VALID_TX_TYPES}")

        df = self._build_feature_df(step, amount, tx_type, old_bal_orig, new_bal_orig,
                                    old_bal_dest, new_bal_dest)
        dmatrix = xgb.DMatrix(df)
        prob = float(self.booster.predict(dmatrix)[0])

        shap_explanation = None
        if self.shap_available:
            try:
                shap_vals = self.explainer.shap_values(df)
                contributions = list(zip(self.feature_order, shap_vals[0].tolist()))
                contributions.sort(key=lambda x: abs(x[1]), reverse=True)
                shap_explanation = [
                    {
                        "feature": self._friendly_feature_name(feat),
                        "raw_feature": feat,
                        "contribution": round(float(val), 4),
                        "direction": "increases_risk" if val > 0 else "decreases_risk",
                        "feature_value": round(float(df[feat].iloc[0]), 2),
                    }
                    for feat, val in contributions[:6]
                ]
            except Exception as e:
                logger.warning(f"SHAP computation failed: {e}")

        return {
            "probability": round(prob, 6),
            "is_above_threshold": prob >= self.threshold,
            "shap_explanation": shap_explanation,
        }

    def _build_feature_df(self, step, amount, tx_type, old_bal_orig, new_bal_orig,
                           old_bal_dest, new_bal_dest) -> pd.DataFrame:
        """
        Construct the exact 12-feature DataFrame matching the model's feature_order using preprocessing pipeline.
        """
        return build_inference_features(
            step=step,
            amount=amount,
            tx_type=tx_type,
            old_bal_orig=old_bal_orig,
            new_bal_orig=new_bal_orig,
            old_bal_dest=old_bal_dest,
            new_bal_dest=new_bal_dest,
            feature_order=self.feature_order,
            encoder=self.encoder,
        )



    def _friendly_feature_name(self, feat: str) -> str:
        names = {
            "step": "Transaction Time Step",
            "amount": "Transaction Amount",
            "balance_diff_old": "Sender Balance Error",
            "balance_diff_new": "Receiver Balance Error",
            "money_movement": "Money Movement",
            "balance_diff_error_old": "Sender Net Balance Change",
            "balance_diff_error_new": "Receiver Net Balance Change",
            "type_CASH_IN": "Type: Cash In",
            "type_CASH_OUT": "Type: Cash Out",
            "type_DEBIT": "Type: Debit",
            "type_PAYMENT": "Type: Payment",
            "type_TRANSFER": "Type: Transfer",
        }
        return names.get(feat, feat)


# Singleton instance — loaded once at startup
_inference_service: Optional[FraudInferenceService] = None


def get_inference_service() -> FraudInferenceService:
    global _inference_service
    if _inference_service is None:
        _inference_service = FraudInferenceService()
    return _inference_service
