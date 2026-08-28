from pydantic import BaseModel
from typing import List, Dict, Optional


class RiskDistribution(BaseModel):
    LOW: int = 0
    MEDIUM: int = 0
    HIGH: int = 0
    CRITICAL: int = 0


class AlertsOverTime(BaseModel):
    date: str
    count: int
    critical: int
    high: int


class DashboardStats(BaseModel):
    total_analyzed: int
    high_risk_count: int
    critical_alerts: int
    open_cases: int
    potential_mule_accounts: int
    suspicious_networks: int
    risk_distribution: RiskDistribution
    alerts_over_time: List[AlertsOverTime]
    recent_alerts: List[Dict]
    priority_cases: List[Dict]
