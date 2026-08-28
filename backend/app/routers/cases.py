"""
Case management router — create, retrieve, and take actions on investigation cases.
"""

import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.models.transaction import Transaction
from app.models.account import Account
from app.schemas.case import (
    CaseCreateRequest,
    CaseActionRequest,
    CaseResponse,
    CaseListItem,
    AuditEntry,
)

router = APIRouter(prefix="/cases", tags=["cases"])

VALID_ACTIONS = {"ADD_NOTE", "ESCALATE", "MARK_FALSE_POSITIVE", "MARK_CONFIRMED_FRAUD"}


def _mask(account_id: str) -> str:
    if len(account_id) <= 4:
        return account_id
    return "XXXX" + account_id[-4:]


def _build_case_response(case: Case, db: Session) -> CaseResponse:
    txn = db.query(Transaction).filter(Transaction.transaction_id == case.transaction_id).first()
    audit = case.audit_log or []
    return CaseResponse(
        case_id=case.case_id,
        transaction_id=case.transaction_id,
        primary_account_id=case.primary_account_id,
        masked_account_id=_mask(case.primary_account_id),
        risk_score=case.risk_score,
        status=case.status,
        priority=case.priority,
        assigned_investigator=case.assigned_investigator,
        created_at=case.created_at.isoformat() if case.created_at else "",
        updated_at=case.updated_at.isoformat() if case.updated_at else "",
        notes=case.notes,
        audit_log=[AuditEntry(**e) for e in audit],
        transaction_amount=txn.amount if txn else None,
        transaction_type=txn.transaction_type if txn else None,
        fraud_probability=txn.fraud_probability if txn else None,
        risk_level=txn.risk_level if txn else None,
        risk_factors=txn.risk_factors if txn else None,
    )


@router.post("/", response_model=CaseResponse)
def create_case(request: CaseCreateRequest, db: Session = Depends(get_db)):
    # Validate transaction
    txn = db.query(Transaction).filter(Transaction.transaction_id == request.transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Determine priority from risk level
    priority_map = {"CRITICAL": "CRITICAL", "HIGH": "HIGH", "MEDIUM": "MEDIUM", "LOW": "LOW"}
    priority = priority_map.get(txn.risk_level or "MEDIUM", "MEDIUM")

    now = datetime.utcnow()
    case_id = f"CASE{uuid.uuid4().hex[:6].upper()}"
    initial_log = [{
        "action": "CASE_CREATED",
        "investigator": request.assigned_investigator or "System",
        "timestamp": now.isoformat(),
        "details": f"Case opened from transaction {request.transaction_id}. "
                   f"Risk: {txn.risk_level}, Probability: {txn.fraud_probability:.1%}"
                   if txn.fraud_probability else f"Case opened from transaction {request.transaction_id}.",
    }]

    case = Case(
        case_id=case_id,
        transaction_id=request.transaction_id,
        primary_account_id=txn.receiver_account_id,  # Focus on receiver (usually the suspicious party)
        risk_score=txn.risk_score or 0,
        status="OPEN",
        priority=priority,
        assigned_investigator=request.assigned_investigator or "Investigator",
        created_at=now,
        updated_at=now,
        notes=request.notes,
        audit_log=initial_log,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return _build_case_response(case, db)


@router.get("/", response_model=list)
def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Case)
    if status:
        q = q.filter(Case.status == status.upper())
    if priority:
        q = q.filter(Case.priority == priority.upper())

    total = q.count()
    cases = q.order_by(Case.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for c in cases:
        txn = db.query(Transaction).filter(Transaction.transaction_id == c.transaction_id).first()
        result.append({
            "case_id": c.case_id,
            "transaction_id": c.transaction_id,
            "primary_account_id": c.primary_account_id,
            "masked_account_id": _mask(c.primary_account_id),
            "risk_score": c.risk_score,
            "status": c.status,
            "priority": c.priority,
            "assigned_investigator": c.assigned_investigator,
            "created_at": c.created_at.isoformat() if c.created_at else "",
            "transaction_amount": txn.amount if txn else None,
            "fraud_probability": txn.fraud_probability if txn else None,
            "risk_level": txn.risk_level if txn else None,
        })

    return result


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return _build_case_response(case, db)


@router.post("/{case_id}/actions", response_model=CaseResponse)
def add_case_action(case_id: str, request: CaseActionRequest, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    action = request.action.upper()
    if action not in VALID_ACTIONS:
        raise HTTPException(status_code=422, detail=f"Invalid action. Must be one of {list(VALID_ACTIONS)}")

    now = datetime.utcnow()
    audit_entry = {
        "action": action,
        "investigator": request.investigator,
        "timestamp": now.isoformat(),
        "details": request.details,
    }

    audit = list(case.audit_log or [])
    audit.append(audit_entry)
    case.audit_log = audit
    case.updated_at = now

    # Update case status based on action
    if action == "ESCALATE":
        case.status = "ESCALATED"
    elif action == "MARK_FALSE_POSITIVE":
        case.status = "CLOSED"
        case.notes = (case.notes or "") + f"\n[{now.date()}] Marked as FALSE POSITIVE by {request.investigator}."
    elif action == "MARK_CONFIRMED_FRAUD":
        case.status = "CLOSED"
        case.notes = (case.notes or "") + f"\n[{now.date()}] CONFIRMED FRAUD by {request.investigator}."
    elif action == "ADD_NOTE" and case.status == "OPEN":
        case.status = "UNDER_INVESTIGATION"

    db.commit()
    db.refresh(case)
    return _build_case_response(case, db)
