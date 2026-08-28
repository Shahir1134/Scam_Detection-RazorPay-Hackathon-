"""
Mule account detection service.
Computes a 0-100 mule risk score from behavioral signals.
This is an INVESTIGATION SIGNAL — not proof of criminal activity.
"""

from typing import Dict, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.models.incident import Incident
from app.models.account import Account


def calculate_mule_score(db: Session, account_id: str) -> Dict:
    """
    Compute potential mule account score (0-100) based on behavioral signals.
    Higher = more suspicious. NOT a criminal determination.
    """
    now = datetime.utcnow()
    signals: List[str] = []
    score = 0

    # Fetch account
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        return {"mule_score": 0, "signals": [], "risk_label": "UNKNOWN"}

    # Account age
    if account.account_open_date:
        age_days = (now.date() - account.account_open_date).days
        if age_days <= 7:
            score += 20
            signals.append(f"Account is very new ({age_days} days old)")
        elif age_days <= 30:
            score += 12
            signals.append(f"Account is relatively new ({age_days} days old)")
        elif age_days <= 90:
            score += 5

    # Incoming sender diversity
    sent_txns = db.query(Transaction).filter(Transaction.sender_account_id == account_id).all()
    recv_txns = db.query(Transaction).filter(Transaction.receiver_account_id == account_id).all()

    unique_senders = len(set(t.sender_account_id for t in recv_txns))
    unique_receivers = len(set(t.receiver_account_id for t in sent_txns))

    if unique_senders >= 50:
        score += 25
        signals.append(f"Received money from {unique_senders} different accounts")
    elif unique_senders >= 20:
        score += 15
        signals.append(f"Received money from {unique_senders} different accounts")
    elif unique_senders >= 10:
        score += 8

    # High receiver diversity (layering)
    if unique_receivers >= 20:
        score += 15
        signals.append(f"Sent money to {unique_receivers} different accounts")
    elif unique_receivers >= 10:
        score += 8

    # Volume imbalance (receive a lot, send a lot — typical mule behavior)
    total_incoming = sum(t.amount for t in recv_txns)
    total_outgoing = sum(t.amount for t in sent_txns)

    if total_incoming > 100000 and total_outgoing > 0:
        outgoing_ratio = total_outgoing / total_incoming
        if outgoing_ratio >= 0.85:
            score += 20
            signals.append(
                f"High fund pass-through: ₹{total_incoming:,.0f} received, "
                f"₹{total_outgoing:,.0f} sent out ({outgoing_ratio:.0%} pass-through rate)"
            )
        elif outgoing_ratio >= 0.60:
            score += 10
            signals.append(f"Significant fund pass-through ({outgoing_ratio:.0%})")

    # Recent velocity (last 24 hours)
    recent_sent = [t for t in sent_txns if t.timestamp >= now - timedelta(hours=24)]
    if len(recent_sent) >= 10:
        score += 15
        signals.append(f"Very high recent outgoing velocity: {len(recent_sent)} transactions in 24 hours")
    elif len(recent_sent) >= 5:
        score += 8

    # Previous flags
    incidents = db.query(Incident).filter(Incident.account_id == account_id).all()
    confirmed = sum(1 for i in incidents if i.status == "CONFIRMED_FRAUD")
    flagged = len(incidents)

    if confirmed >= 2:
        score += 20
        signals.append(f"{confirmed} previously confirmed fraud incident(s)")
    elif flagged >= 5:
        score += 12
        signals.append(f"{flagged} previous incident flags on this account")
    elif flagged >= 2:
        score += 6

    # Connected high-risk accounts (batch query for performance)
    other_ids = set(
        txn.sender_account_id if txn.receiver_account_id == account_id else txn.receiver_account_id
        for txn in (recv_txns + sent_txns)
    )
    if other_ids:
        connected_high_risk = (
            db.query(Account.account_id)
            .filter(Account.account_id.in_(other_ids), Account.risk_score >= 60)
            .count()
        )
    else:
        connected_high_risk = 0

    if connected_high_risk >= 5:
        score += 15
        signals.append(f"Connected to {connected_high_risk} high-risk accounts")
    elif connected_high_risk >= 2:
        score += 7

    score = min(100, score)

    # Risk label
    if score >= 75:
        risk_label = "VERY HIGH"
    elif score >= 55:
        risk_label = "HIGH"
    elif score >= 35:
        risk_label = "MODERATE"
    else:
        risk_label = "LOW"

    return {
        "mule_score": score,
        "signals": signals,
        "risk_label": risk_label,
        "unique_senders": unique_senders,
        "unique_receivers": unique_receivers,
        "total_incoming": round(total_incoming, 2),
        "total_outgoing": round(total_outgoing, 2),
        "incident_count": flagged,
        "confirmed_fraud_count": confirmed,
    }
