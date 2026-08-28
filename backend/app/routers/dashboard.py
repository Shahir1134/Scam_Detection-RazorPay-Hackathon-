"""
Dashboard statistics router.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.case import Case
from app.models.incident import Incident

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _mask(account_id: str) -> str:
    return "XXXX" + account_id[-4:] if len(account_id) > 4 else account_id


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    total_analyzed = db.query(Transaction).filter(Transaction.is_analyzed == True).count()  # noqa
    critical = db.query(Transaction).filter(Transaction.risk_level == "CRITICAL").count()
    high = db.query(Transaction).filter(Transaction.risk_level == "HIGH").count()
    medium = db.query(Transaction).filter(Transaction.risk_level == "MEDIUM").count()
    low = db.query(Transaction).filter(Transaction.risk_level == "LOW").count()
    high_risk_count = critical + high
    open_cases = db.query(Case).filter(Case.status.in_(["OPEN", "UNDER_INVESTIGATION", "ESCALATED"])).count()
    mule_accounts = db.query(Account).filter(Account.risk_status == "HIGH_RISK").count()
    suspicious_networks = max(1, mule_accounts // 2) if mule_accounts > 0 else 0

    # Alerts over time (last 7 days)
    alerts_over_time = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_critical = db.query(Transaction).filter(
            Transaction.risk_level == "CRITICAL",
            Transaction.timestamp >= day_start,
            Transaction.timestamp < day_end,
        ).count()
        day_high = db.query(Transaction).filter(
            Transaction.risk_level.in_(["HIGH", "CRITICAL"]),
            Transaction.timestamp >= day_start,
            Transaction.timestamp < day_end,
        ).count()
        alerts_over_time.append({
            "date": day.strftime("%b %d"),
            "count": day_high,
            "critical": day_critical,
            "high": day_high - day_critical,
        })

    # Recent alerts (last 10 CRITICAL/HIGH transactions)
    recent_txns = (
        db.query(Transaction)
        .filter(Transaction.risk_level.in_(["HIGH", "CRITICAL"]))
        .order_by(Transaction.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_alerts = [
        {
            "transaction_id": t.transaction_id,
            "amount": t.amount,
            "masked_sender": _mask(t.sender_account_id),
            "masked_receiver": _mask(t.receiver_account_id),
            "sender_account_id": t.sender_account_id,
            "receiver_account_id": t.receiver_account_id,
            "risk_level": t.risk_level,
            "fraud_probability": t.fraud_probability,
            "timestamp": t.timestamp.isoformat() if t.timestamp else "",
            "transaction_type": t.transaction_type,
        }
        for t in recent_txns
    ]

    # Priority cases
    priority_cases_q = (
        db.query(Case)
        .filter(Case.status.in_(["OPEN", "UNDER_INVESTIGATION", "ESCALATED"]))
        .order_by(Case.created_at.desc())
        .limit(5)
        .all()
    )
    txn_ids = [c.transaction_id for c in priority_cases_q if c.transaction_id]
    txns_map = {t.transaction_id: t for t in db.query(Transaction).filter(Transaction.transaction_id.in_(txn_ids)).all()} if txn_ids else {}

    priority_cases = []
    for c in priority_cases_q:
        txn = txns_map.get(c.transaction_id)
        priority_cases.append({
            "case_id": c.case_id,
            "priority": c.priority,
            "status": c.status,
            "assigned_investigator": c.assigned_investigator,
            "created_at": c.created_at.isoformat() if c.created_at else "",
            "transaction_amount": txn.amount if txn else None,
            "fraud_probability": txn.fraud_probability if txn else None,
            "masked_account": _mask(c.primary_account_id),
            "primary_account_id": c.primary_account_id,
        })

    return {
        "total_analyzed": total_analyzed,
        "high_risk_count": high_risk_count,
        "critical_alerts": critical,
        "open_cases": open_cases,
        "potential_mule_accounts": mule_accounts,
        "suspicious_networks": suspicious_networks,
        "risk_distribution": {
            "LOW": low,
            "MEDIUM": medium,
            "HIGH": high,
            "CRITICAL": critical,
        },
        "alerts_over_time": alerts_over_time,
        "recent_alerts": recent_alerts,
        "priority_cases": priority_cases,
    }
