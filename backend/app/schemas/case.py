from pydantic import BaseModel
from typing import List, Optional, Any, Dict


class CaseCreateRequest(BaseModel):
    transaction_id: str
    notes: Optional[str] = None
    assigned_investigator: Optional[str] = "Investigator"


class CaseActionRequest(BaseModel):
    action: str  # ADD_NOTE, ESCALATE, MARK_FALSE_POSITIVE, MARK_CONFIRMED_FRAUD
    investigator: str
    details: str


class AuditEntry(BaseModel):
    action: str
    investigator: str
    timestamp: str
    details: str


class CaseResponse(BaseModel):
    case_id: str
    transaction_id: str
    primary_account_id: str
    masked_account_id: str
    risk_score: int
    status: str
    priority: str
    assigned_investigator: str
    created_at: str
    updated_at: str
    notes: Optional[str]
    audit_log: List[AuditEntry]
    # Enriched fields
    transaction_amount: Optional[float]
    transaction_type: Optional[str]
    fraud_probability: Optional[float]
    risk_level: Optional[str]
    risk_factors: Optional[List[str]]


class CaseListItem(BaseModel):
    case_id: str
    transaction_id: str
    primary_account_id: str
    masked_account_id: str
    risk_score: int
    status: str
    priority: str
    assigned_investigator: str
    created_at: str
    transaction_amount: Optional[float]
    fraud_probability: Optional[float]
