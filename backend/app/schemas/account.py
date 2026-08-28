from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class BehavioralStats(BaseModel):
    avg_transaction_amount: float
    std_transaction_amount: float
    min_amount: float
    max_amount: float
    tx_count_5min: int
    tx_count_1hr: int
    tx_count_24hr: int
    tx_count_7days: int
    tx_count_30days: int
    unique_senders: int
    unique_receivers: int
    total_incoming: float
    total_outgoing: float
    last_transaction_at: Optional[str]
    total_transactions: int


class MuleInfo(BaseModel):
    mule_score: int
    signals: List[str]
    risk_label: str
    unique_senders: int
    unique_receivers: int
    total_incoming: float
    total_outgoing: float
    incident_count: int
    confirmed_fraud_count: int


class AccountDetail(BaseModel):
    account_id: str
    masked_account_id: str
    customer_id: str
    customer_name: str
    kyc_status: str
    account_type: str
    account_open_date: Optional[str]
    account_age_days: int
    status: str
    balance: float
    risk_score: int
    risk_status: str
    masked_phone: str
    masked_address: str
    location_city: Optional[str]
    location_state: Optional[str]
    behavioral_stats: BehavioralStats
    mule_info: MuleInfo
    incident_count: int


class IncidentResponse(BaseModel):
    incident_id: str
    account_id: str
    transaction_id: Optional[str]
    incident_type: str
    status: str
    severity: str
    description: Optional[str]
    created_at: str
    resolved_at: Optional[str]
    resolution: Optional[str]


class AccountListItem(BaseModel):
    account_id: str
    masked_account_id: str
    customer_id: str
    customer_name: str
    kyc_status: str
    account_type: str
    account_open_date: Optional[str]
    account_age_days: int
    status: str
    balance: float
    risk_score: int
    risk_status: str
    mule_score: int
    incident_count: int
    location_city: Optional[str]
    location_state: Optional[str]


class AccountListResponse(BaseModel):
    items: List[AccountListItem]
    total: int
    page: int
    page_size: int

