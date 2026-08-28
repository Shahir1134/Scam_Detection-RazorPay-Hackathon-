from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Dict
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./scamdetect.db"
    MODEL_PATH: str = "fraud_model.json"
    ENCODER_PATH: str = "type_encoder.pkl"
    METADATA_PATH: str = "fraud_model_metadata.json"
    SECRET_KEY: str = "razorpay-hackathon-2026"
    DEBUG: bool = True

    # Risk level thresholds (fraud_probability >= threshold → that level)
    RISK_THRESHOLDS: Dict[str, float] = {
        "CRITICAL": 0.85,
        "HIGH": 0.60,
        "MEDIUM": 0.30,
        "LOW": 0.0,
    }

    # Model's own classification threshold
    MODEL_FRAUD_THRESHOLD: float = 0.99525

    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
