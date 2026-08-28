"""
Behavioral analysis service — computes velocity, historical stats, and deviation signals.
These are investigation signals, separate from ML model output.
"""

from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.transaction import Transaction


def get_account_behavioral_stats(db: Session, account_id: str) -> Dict:
    """
    Compute comprehensive behavioral statistics for an account.
    Queries both sent and received transactions.
    """
    now = datetime.utcnow()

    # All outgoing transactions
    sent_q = db.query(Transaction).filter(
        Transaction.sender_account_id == account_id
    )
    # All incoming transactions
    recv_q = db.query(Transaction).filter(
        Transaction.receiver_account_id == account_id
    )

    all_sent = sent_q.all()
    all_recv = recv_q.all()

    # Amount stats (from sent transactions — this is what the account initiates)
    sent_amounts = [t.amount for t in all_sent]
    avg_amount = sum(sent_amounts) / len(sent_amounts) if sent_amounts else 0.0
    std_amount = _std(sent_amounts)
    min_amount = min(sent_amounts) if sent_amounts else 0.0
    max_amount = max(sent_amounts) if sent_amounts else 0.0

    # Velocity windows (sent)
    tx_5min = sum(1 for t in all_sent if t.timestamp >= now - timedelta(minutes=5))
    tx_1hr = sum(1 for t in all_sent if t.timestamp >= now - timedelta(hours=1))
    tx_24hr = sum(1 for t in all_sent if t.timestamp >= now - timedelta(hours=24))
    tx_7d = sum(1 for t in all_sent if t.timestamp >= now - timedelta(days=7))
    tx_30d = len(all_sent)

    # Counterparties
    unique_receivers = len(set(t.receiver_account_id for t in all_sent))
    unique_senders = len(set(t.sender_account_id for t in all_recv))

    # Volume
    total_outgoing = sum(t.amount for t in all_sent)
    total_incoming = sum(t.amount for t in all_recv)

    # Last transaction
    all_txns = all_sent + all_recv
    last_txn = max((t.timestamp for t in all_txns), default=None)

    return {
        "avg_transaction_amount": round(avg_amount, 2),
        "std_transaction_amount": round(std_amount, 2),
        "min_amount": round(min_amount, 2),
        "max_amount": round(max_amount, 2),
        "tx_count_5min": tx_5min,
        "tx_count_1hr": tx_1hr,
        "tx_count_24hr": tx_24hr,
        "tx_count_7days": tx_7d,
        "tx_count_30days": tx_30d,
        "unique_senders": unique_senders,
        "unique_receivers": unique_receivers,
        "total_incoming": round(total_incoming, 2),
        "total_outgoing": round(total_outgoing, 2),
        "last_transaction_at": last_txn.isoformat() if last_txn else None,
        "total_transactions": len(all_txns),
    }


def check_is_new_recipient(db: Session, sender_account_id: str, receiver_account_id: str) -> bool:
    """Check if sender has ever transacted with receiver before."""
    count = db.query(Transaction).filter(
        Transaction.sender_account_id == sender_account_id,
        Transaction.receiver_account_id == receiver_account_id,
    ).count()
    return count == 0


def get_amount_deviation(amount: float, avg: float, std: float) -> Optional[float]:
    """Compute z-score of current amount vs historical."""
    if std <= 0 or avg <= 0:
        return None
    return round((amount - avg) / std, 2)


def _std(values):
    if len(values) < 2:
        return 0.0
    n = len(values)
    mean = sum(values) / n
    variance = sum((x - mean) ** 2 for x in values) / (n - 1)
    return variance ** 0.5
