"""
Account investigation router — profile, transactions, incidents, network.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.models.incident import Incident
from app.schemas.account import AccountDetail, BehavioralStats, MuleInfo, IncidentResponse, AccountListItem, AccountListResponse
from app.schemas.transaction import TransactionListItem, TransactionListResponse
from app.services.behavioral import get_account_behavioral_stats
from app.services.mule_detector import calculate_mule_score
from app.services.network import build_account_network

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _mask_account(account_id: str) -> str:
    if len(account_id) <= 4:
        return account_id
    return "XXXX" + account_id[-4:]


def _mask_phone(phone: str) -> str:
    if not phone or len(phone) <= 4:
        return "XXXXXXXXXX"
    return "XXXXXX" + phone[-4:]


def _mask_address(address: str) -> str:
    if not address:
        return "Address on file"
    # Return only the last part (city/state level)
    parts = address.split(",")
    if len(parts) >= 2:
        return ", ".join(p.strip() for p in parts[-2:])
    return address


from sqlalchemy import func

@router.get("/", response_model=AccountListResponse)
def list_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    risk_status: Optional[str] = Query(None),
    kyc_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("risk_score", pattern="^(risk_score|balance|account_open_date)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    query = db.query(Account, Customer).outerjoin(Customer, Account.customer_id == Customer.customer_id)

    if risk_status:
        query = query.filter(Account.risk_status == risk_status.upper())

    if kyc_status:
        query = query.filter(Customer.kyc_status == kyc_status.upper())

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Account.account_id.ilike(search_term)) |
            (Customer.name.ilike(search_term)) |
            (Account.location_city.ilike(search_term))
        )

    # Sorting
    sort_col = getattr(Account, sort_by, Account.risk_score)
    if sort_order.lower() == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    now = datetime.utcnow()
    acc_ids = [acc.account_id for acc, _ in rows]
    incident_counts = {}
    if acc_ids:
        inc_rows = (
            db.query(Incident.account_id, func.count(Incident.incident_id))
            .filter(Incident.account_id.in_(acc_ids))
            .group_by(Incident.account_id)
            .all()
        )
        incident_counts = {acc_id: count for acc_id, count in inc_rows}

    items = []
    for acc, cust in rows:
        age_days = 0
        if acc.account_open_date:
            age_days = (now.date() - acc.account_open_date).days

        inc_count = incident_counts.get(acc.account_id, 0)
        # Fast mule score estimation for list view; detailed graph analysis is on account detail page
        mule_est = acc.risk_score if acc.risk_status == "HIGH_RISK" else min(100, int(acc.risk_score * 0.9) + (15 if inc_count > 0 else 0))

        items.append(
            AccountListItem(
                account_id=acc.account_id,
                masked_account_id=_mask_account(acc.account_id),
                customer_id=acc.customer_id,
                customer_name=cust.name if cust else "Unknown",
                kyc_status=cust.kyc_status if cust else "UNKNOWN",
                account_type=acc.account_type,
                account_open_date=acc.account_open_date.isoformat() if acc.account_open_date else None,
                account_age_days=age_days,
                status=acc.status,
                balance=acc.balance,
                risk_score=acc.risk_score,
                risk_status=acc.risk_status,
                mule_score=mule_est,
                incident_count=inc_count,
                location_city=acc.location_city,
                location_state=acc.location_state,
            )
        )

    return AccountListResponse(items=items, total=total, page=page, page_size=page_size)

@router.get("/{account_id}", response_model=AccountDetail)
def get_account(account_id: str, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail=f"Account {account_id} not found")

    customer = db.query(Customer).filter(Customer.customer_id == account.customer_id).first()

    # Account age
    now = datetime.utcnow()
    age_days = 0
    if account.account_open_date:
        age_days = (now.date() - account.account_open_date).days

    # Behavioral stats
    stats = get_account_behavioral_stats(db, account_id)

    # Mule score
    mule_info = calculate_mule_score(db, account_id)

    # Incident count
    incident_count = db.query(Incident).filter(Incident.account_id == account_id).count()

    return AccountDetail(
        account_id=account_id,
        masked_account_id=_mask_account(account_id),
        customer_id=account.customer_id,
        customer_name=customer.name if customer else "Unknown",
        kyc_status=customer.kyc_status if customer else "UNKNOWN",
        account_type=account.account_type,
        account_open_date=account.account_open_date.isoformat() if account.account_open_date else None,
        account_age_days=age_days,
        status=account.status,
        balance=account.balance,
        risk_score=account.risk_score,
        risk_status=account.risk_status,
        masked_phone=_mask_phone(customer.registered_phone if customer else ""),
        masked_address=_mask_address(customer.registered_address if customer else ""),
        location_city=account.location_city,
        location_state=account.location_state,
        behavioral_stats=BehavioralStats(**stats),
        mule_info=MuleInfo(**mule_info),
        incident_count=incident_count,
    )


@router.get("/{account_id}/transactions", response_model=TransactionListResponse)
def get_account_transactions(
    account_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    q = db.query(Transaction).filter(
        (Transaction.sender_account_id == account_id) |
        (Transaction.receiver_account_id == account_id)
    )
    total = q.count()
    txns = q.order_by(Transaction.timestamp.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [
        TransactionListItem(
            transaction_id=t.transaction_id,
            sender_account_id=t.sender_account_id,
            receiver_account_id=t.receiver_account_id,
            masked_sender=_mask_account(t.sender_account_id),
            masked_receiver=_mask_account(t.receiver_account_id),
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


@router.get("/{account_id}/incidents")
def get_account_incidents(account_id: str, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    incidents = (
        db.query(Incident)
        .filter(Incident.account_id == account_id)
        .order_by(Incident.created_at.desc())
        .all()
    )

    return [
        IncidentResponse(
            incident_id=inc.incident_id,
            account_id=inc.account_id,
            transaction_id=inc.transaction_id,
            incident_type=inc.incident_type,
            status=inc.status,
            severity=inc.severity,
            description=inc.description,
            created_at=inc.created_at.isoformat() if inc.created_at else "",
            resolved_at=inc.resolved_at.isoformat() if inc.resolved_at else None,
            resolution=inc.resolution,
        )
        for inc in incidents
    ]


@router.get("/{account_id}/network")
def get_account_network(
    account_id: str,
    depth: int = Query(2, ge=1, le=3),
    days: Optional[int] = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return build_account_network(db, account_id, depth=depth, days=days)

