from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class TransactionAnalyzeRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount in INR")
    type: str = Field(..., description="Transaction type: TRANSFER, CASH_OUT, CASH_IN, PAYMENT, DEBIT")
    sender_account: str = Field(..., description="Sender account ID")
    receiver_account: str = Field(..., description="Receiver account ID")


class ShapEntry(BaseModel):
    feature: str
    raw_feature: str
    contribution: float
    direction: str  # increases_risk / decreases_risk
    feature_value: float


class RiskBreakdownComponent(BaseModel):
    name: str
    key: str
    score: float
    max_score: float
    summary: str
    evidence: Dict[str, Any]
    significance: str


class InvestigatorExplanation(BaseModel):
    headline: str
    summary: str
    ml_signal_level: str
    investigation_intel_level: str


class TransactionAnalyzeResponse(BaseModel):
    transaction_id: str
    fraud_probability: float
    risk_level: str
    risk_score: int
    investigation_risk: int
    risk_factors: List[str]
    risk_breakdown: List[RiskBreakdownComponent]
    investigator_explanation: InvestigatorExplanation
    shap_explanation: Optional[List[ShapEntry]]
    amount: float
    transaction_type: str
    sender_account: str  # masked
    receiver_account: str  # masked
    sender_account_id: str  # raw (for linking)
    receiver_account_id: str  # raw
    timestamp: str
    is_above_model_threshold: bool
    model_threshold: float
    behavioral_signals: Dict[str, Any]
    risk_summary: str


class TransactionDetail(BaseModel):
    transaction_id: str
    sender_account_id: str
    receiver_account_id: str
    masked_sender: str
    masked_receiver: str
    amount: float
    transaction_type: str
    timestamp: str
    status: str
    fraud_probability: Optional[float]
    risk_score: Optional[int]
    investigation_risk: Optional[int] = None
    risk_level: Optional[str]
    risk_factors: Optional[List[str]]
    risk_breakdown: Optional[List[RiskBreakdownComponent]] = None
    investigator_explanation: Optional[InvestigatorExplanation] = None
    shap_explanation: Optional[List[ShapEntry]]
    is_analyzed: bool
    sender_risk_score: Optional[int]
    receiver_risk_score: Optional[int]


class TransactionListItem(BaseModel):
    transaction_id: str
    sender_account_id: str
    receiver_account_id: str
    masked_sender: str
    masked_receiver: str
    amount: float
    transaction_type: str
    timestamp: str
    status: str
    fraud_probability: Optional[float]
    risk_level: Optional[str]
    risk_score: Optional[int]
    is_analyzed: bool


class TransactionListResponse(BaseModel):
    items: List[TransactionListItem]
    total: int
    page: int
    page_size: int
