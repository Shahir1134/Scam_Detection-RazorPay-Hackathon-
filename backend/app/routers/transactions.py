"""
Transaction router — analyze, fetch, and list transactions.
POST /api/v1/transactions/analyze is the core endpoint.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.incident import Incident
from app.schemas.transaction import (
    TransactionAnalyzeRequest,
    TransactionAnalyzeResponse,
    TransactionDetail,
    TransactionListItem,
    TransactionListResponse,
)
from app.services.inference import get_inference_service
from app.services.risk_engine import (
    probability_to_risk_level,
    probability_to_risk_score,
    calculate_risk_factors,
    get_risk_summary,
)
from app.services.behavioral import (
    get_account_behavioral_stats,
    check_is_new_recipient,
)
from app.config import settings

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _mask(account_id: str) -> str:
    if len(account_id) <= 4:
        return account_id
    return "XXXX" + account_id[-4:]


@router.post("/analyze", response_model=TransactionAnalyzeResponse)
def analyze_transaction(request: TransactionAnalyzeRequest, db: Session = Depends(get_db)):
    """
    Core endpoint: run XGBoost fraud detection on a transaction.
    Steps: validate → fetch balances → build features → infer → enrich → persist → respond
    """
    # 1. Validate accounts exist
    sender = db.query(Account).filter(Account.account_id == request.sender_account).first()
    if not sender:
        raise HTTPException(status_code=404, detail=f"Sender account {request.sender_account} not found")

    receiver = db.query(Account).filter(Account.account_id == request.receiver_account).first()
    if not receiver:
        raise HTTPException(status_code=404, detail=f"Receiver account {request.receiver_account} not found")

    tx_type = request.type.upper()
    valid_types = ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]
    if tx_type not in valid_types:
        raise HTTPException(status_code=422, detail=f"Invalid type. Must be one of {valid_types}")

    # 2. Derive balance fields from DB state (bank-side logic)
    old_bal_orig = float(max(sender.balance, request.amount) if sender.balance < request.amount else sender.balance)
    new_bal_orig = float(max(0.0, old_bal_orig - request.amount))
    old_bal_dest = float(receiver.balance)
    new_bal_dest = float(receiver.balance + request.amount)

    # 3. Compute PaySim step (hours since midnight mod 744)
    now = datetime.utcnow()
    step = (now.hour + now.day * 24) % 744 + 1

    # 4. Run ML inference
    inference_svc = get_inference_service()
    result = inference_svc.predict(
        step=step,
        amount=request.amount,
        tx_type=tx_type,
        old_bal_orig=old_bal_orig,
        new_bal_orig=new_bal_orig,
        old_bal_dest=old_bal_dest,
        new_bal_dest=new_bal_dest,
    )
    fraud_prob = result["probability"]
    shap_explanation = result.get("shap_explanation")

    # 5. Behavioral & recipient intelligence signals
    sender_stats = get_account_behavioral_stats(db, request.sender_account)
    is_new_recipient = check_is_new_recipient(db, request.sender_account, request.receiver_account)

    sender_incidents = db.query(Incident).filter(Incident.account_id == request.sender_account).count()
    receiver_incidents = db.query(Incident).filter(Incident.account_id == request.receiver_account).count()

    from app.models.customer import Customer
    receiver_customer = db.query(Customer).filter(Customer.customer_id == receiver.customer_id).first()
    receiver_kyc = receiver_customer.kyc_status if receiver_customer else "UNKNOWN"

    from app.services.mule_detector import calculate_mule_score
    mule_data = calculate_mule_score(db, request.receiver_account)
    receiver_mule_score = mule_data.get("mule_score", 0)
    receiver_unique_senders = mule_data.get("unique_senders", 0)
    total_in = mule_data.get("total_incoming", 0.0)
    total_out = mule_data.get("total_outgoing", 0.0)
    pass_through_rate = (total_out / total_in) if total_in > 0 else 0.0

    # Connected high risk accounts
    sent_txs = db.query(Transaction.receiver_account_id).filter(Transaction.sender_account_id == request.receiver_account).all()
    recv_txs = db.query(Transaction.sender_account_id).filter(Transaction.receiver_account_id == request.receiver_account).all()
    connected_ids = set([t[0] for t in sent_txs + recv_txs])
    connected_high_risk = db.query(Account.account_id).filter(Account.account_id.in_(connected_ids), Account.risk_score >= 60).count() if connected_ids else 0

    account_age_days = 9999
    if receiver.account_open_date:
        account_age_days = (now.date() - receiver.account_open_date).days

    # 6. Explainable Risk Breakdown (Deterministic 100-pt engine)
    from app.services.risk_engine import calculate_explainable_risk_breakdown, get_risk_summary
    breakdown_result = calculate_explainable_risk_breakdown(
        fraud_probability=fraud_prob,
        amount=request.amount,
        tx_type=tx_type,
        sender_account_id=request.sender_account,
        receiver_account_id=request.receiver_account,
        sender_balance=old_bal_orig,
        receiver_balance=old_bal_dest,
        historical_avg=sender_stats["avg_transaction_amount"],
        historical_std=sender_stats["std_transaction_amount"],
        is_new_recipient=is_new_recipient,
        sender_incident_count=sender_incidents,
        receiver_incident_count=receiver_incidents,
        receiver_age_days=account_age_days,
        receiver_kyc_status=receiver_kyc,
        receiver_mule_score=receiver_mule_score,
        receiver_unique_senders=receiver_unique_senders,
        connected_high_risk=connected_high_risk,
        pass_through_rate=pass_through_rate,
        velocity_5min=sender_stats["tx_count_5min"],
        velocity_1hr=sender_stats["tx_count_1hr"],
    )

    risk_score = breakdown_result["investigation_risk"]
    risk_level = breakdown_result["risk_level"]
    risk_breakdown = breakdown_result["risk_breakdown"]
    investigator_explanation = breakdown_result["investigator_explanation"]
    risk_factors = breakdown_result["risk_factors"]

    # 7. Save transaction
    txn_id = f"TXN{uuid.uuid4().hex[:8].upper()}"
    txn = Transaction(
        transaction_id=txn_id,
        sender_account_id=request.sender_account,
        receiver_account_id=request.receiver_account,
        amount=request.amount,
        transaction_type=tx_type,
        timestamp=now,
        status="FLAGGED" if risk_level in ("HIGH", "CRITICAL") else "COMPLETED",
        fraud_probability=fraud_prob,
        risk_score=risk_score,
        risk_level=risk_level,
        is_analyzed=True,
        risk_factors=risk_factors,
        shap_values=[s.model_dump() if hasattr(s, "model_dump") else s for s in (shap_explanation or [])],
        step=step,
        oldbalance_sender=old_bal_orig,
        newbalance_sender=new_bal_orig,
        oldbalance_receiver=old_bal_dest,
        newbalance_receiver=new_bal_dest,
    )
    db.add(txn)

    # 8. Update account risk scores if elevated
    if risk_level in ("HIGH", "CRITICAL"):
        new_risk = max(sender.risk_score, risk_score - 10)
        sender.risk_score = new_risk
        if new_risk >= 60:
            sender.risk_status = "MONITORED"

        receiver.risk_score = max(receiver.risk_score, risk_score)
        if receiver.risk_score >= 85:
            receiver.risk_status = "HIGH_RISK"
        elif receiver.risk_score >= 60:
            receiver.risk_status = "MONITORED"

        # Auto-create incident for critical transactions
        if risk_level == "CRITICAL":
            incident = Incident(
                incident_id=f"INC{uuid.uuid4().hex[:8].upper()}",
                account_id=request.receiver_account,
                transaction_id=txn_id,
                incident_type="SUSPICIOUS_TRANSACTION",
                status="FLAGGED",
                severity="CRITICAL",
                description=f"CRITICAL risk transaction of ₹{request.amount:,.0f} flagged by ML model "
                             f"({fraud_prob:.1%} fraud probability)",
            )
            db.add(incident)

    # Update balances
    sender.balance = new_bal_orig
    receiver.balance = new_bal_dest

    db.commit()

    behavioral_signals = {
        "sender_avg_amount": sender_stats["avg_transaction_amount"],
        "sender_tx_count_1hr": sender_stats["tx_count_1hr"],
        "sender_unique_receivers": sender_stats["unique_receivers"],
        "is_new_recipient": is_new_recipient,
        "receiver_risk_score": receiver.risk_score,
        "receiver_incident_count": receiver_incidents,
        "amount_deviation_from_avg": (
            round((request.amount - sender_stats["avg_transaction_amount"]) /
                  max(sender_stats["std_transaction_amount"], 1), 2)
            if sender_stats["avg_transaction_amount"] > 0 else None
        ),
    }

    return TransactionAnalyzeResponse(
        transaction_id=txn_id,
        fraud_probability=fraud_prob,
        risk_level=risk_level,
        risk_score=risk_score,
        investigation_risk=risk_score,
        risk_factors=risk_factors,
        risk_breakdown=risk_breakdown,
        investigator_explanation=investigator_explanation,
        shap_explanation=shap_explanation,
        amount=request.amount,
        transaction_type=tx_type,
        sender_account=_mask(request.sender_account),
        receiver_account=_mask(request.receiver_account),
        sender_account_id=request.sender_account,
        receiver_account_id=request.receiver_account,
        timestamp=now.isoformat(),
        is_above_model_threshold=result["is_above_threshold"],
        model_threshold=settings.MODEL_FRAUD_THRESHOLD,
        behavioral_signals=behavioral_signals,
        risk_summary=get_risk_summary(risk_level),
    )


@router.get("/{transaction_id}", response_model=TransactionDetail)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    sender = db.query(Account).filter(Account.account_id == txn.sender_account_id).first()
    receiver = db.query(Account).filter(Account.account_id == txn.receiver_account_id).first()

    sender_risk = sender.risk_score if sender else 0
    receiver_risk = receiver.risk_score if receiver else 0

    shap = None
    if txn.shap_values:
        shap = txn.shap_values

    # Calculate explainable breakdown for detailed view
    from app.services.behavioral import get_account_behavioral_stats, check_is_new_recipient
    from app.services.mule_detector import calculate_mule_score
    from app.services.risk_engine import calculate_explainable_risk_breakdown
    from app.models.customer import Customer

    sender_stats = get_account_behavioral_stats(db, txn.sender_account_id)
    is_new_recipient = check_is_new_recipient(db, txn.sender_account_id, txn.receiver_account_id)
    sender_incidents = db.query(Incident).filter(Incident.account_id == txn.sender_account_id).count()
    receiver_incidents = db.query(Incident).filter(Incident.account_id == txn.receiver_account_id).count()

    receiver_customer = db.query(Customer).filter(Customer.customer_id == receiver.customer_id).first() if receiver else None
    receiver_kyc = receiver_customer.kyc_status if receiver_customer else "UNKNOWN"

    mule_data = calculate_mule_score(db, txn.receiver_account_id)
    receiver_mule_score = mule_data.get("mule_score", 0)
    receiver_unique_senders = mule_data.get("unique_senders", 0)
    total_in = mule_data.get("total_incoming", 0.0)
    total_out = mule_data.get("total_outgoing", 0.0)
    pass_through_rate = (total_out / total_in) if total_in > 0 else 0.0

    sent_txs = db.query(Transaction.receiver_account_id).filter(Transaction.sender_account_id == txn.receiver_account_id).all()
    recv_txs = db.query(Transaction.sender_account_id).filter(Transaction.receiver_account_id == txn.receiver_account_id).all()
    connected_ids = set([t[0] for t in sent_txs + recv_txs])
    connected_high_risk = db.query(Account.account_id).filter(Account.account_id.in_(connected_ids), Account.risk_score >= 60).count() if connected_ids else 0

    now = datetime.utcnow()
    account_age_days = 9999
    if receiver and receiver.account_open_date:
        account_age_days = (now.date() - receiver.account_open_date).days

    breakdown_result = calculate_explainable_risk_breakdown(
        fraud_probability=txn.fraud_probability or 0.0,
        amount=txn.amount,
        tx_type=txn.transaction_type,
        sender_account_id=txn.sender_account_id,
        receiver_account_id=txn.receiver_account_id,
        sender_balance=txn.oldbalance_sender,
        receiver_balance=txn.oldbalance_receiver,
        historical_avg=sender_stats["avg_transaction_amount"],
        historical_std=sender_stats["std_transaction_amount"],
        is_new_recipient=is_new_recipient,
        sender_incident_count=sender_incidents,
        receiver_incident_count=receiver_incidents,
        receiver_age_days=account_age_days,
        receiver_kyc_status=receiver_kyc,
        receiver_mule_score=receiver_mule_score,
        receiver_unique_senders=receiver_unique_senders,
        connected_high_risk=connected_high_risk,
        pass_through_rate=pass_through_rate,
        velocity_5min=sender_stats["tx_count_5min"],
        velocity_1hr=sender_stats["tx_count_1hr"],
    )

    return TransactionDetail(
        transaction_id=txn.transaction_id,
        sender_account_id=txn.sender_account_id,
        receiver_account_id=txn.receiver_account_id,
        masked_sender=_mask(txn.sender_account_id),
        masked_receiver=_mask(txn.receiver_account_id),
        amount=txn.amount,
        transaction_type=txn.transaction_type,
        timestamp=txn.timestamp.isoformat() if txn.timestamp else "",
        status=txn.status,
        fraud_probability=txn.fraud_probability,
        risk_score=txn.risk_score,
        investigation_risk=txn.risk_score,
        risk_level=txn.risk_level,
        risk_factors=txn.risk_factors or breakdown_result["risk_factors"],
        risk_breakdown=breakdown_result["risk_breakdown"],
        investigator_explanation=breakdown_result["investigator_explanation"],
        shap_explanation=shap,
        is_analyzed=txn.is_analyzed,
        sender_risk_score=sender_risk,
        receiver_risk_score=receiver_risk,
    )


@router.get("/", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    risk_level: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    analyzed_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction)
    if risk_level:
        q = q.filter(Transaction.risk_level == risk_level.upper())
    if account_id:
        q = q.filter(
            (Transaction.sender_account_id == account_id) |
            (Transaction.receiver_account_id == account_id)
        )
    if analyzed_only:
        q = q.filter(Transaction.is_analyzed == True)  # noqa

    total = q.count()
    txns = q.order_by(Transaction.timestamp.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [
        TransactionListItem(
            transaction_id=t.transaction_id,
            sender_account_id=t.sender_account_id,
            receiver_account_id=t.receiver_account_id,
            masked_sender=_mask(t.sender_account_id),
            masked_receiver=_mask(t.receiver_account_id),
            amount=t.amount,
            transaction_type=t.transaction_type,
            timestamp=t.timestamp.isoformat() if t.timestamp else "",
            status=t.status,
            fraud_probability=t.fraud_probability,
            risk_level=t.risk_level,
            risk_score=t.risk_score,
            is_analyzed=t.is_analyzed,
        )
        for t in txns
    ]

    return TransactionListResponse(items=items, total=total, page=page, page_size=page_size)
