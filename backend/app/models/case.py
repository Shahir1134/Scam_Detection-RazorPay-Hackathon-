from sqlalchemy import Column, String, DateTime, Integer, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Case(Base):
    __tablename__ = "cases"

    case_id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.transaction_id"), nullable=False, index=True)
    primary_account_id = Column(String, ForeignKey("accounts.account_id"), nullable=False, index=True)
    risk_score = Column(Integer, default=0)
    status = Column(String, default="OPEN", index=True)  # OPEN, UNDER_INVESTIGATION, ESCALATED, CLOSED
    priority = Column(String, default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    assigned_investigator = Column(String, default="Unassigned")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(String, nullable=True)
    audit_log = Column(JSON, default=list)  # list of {action, investigator, timestamp, details}

    transaction = relationship("Transaction", back_populates="cases")
    primary_account = relationship("Account", back_populates="cases")
