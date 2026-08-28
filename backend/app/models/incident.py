from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(String, primary_key=True, index=True)
    account_id = Column(String, ForeignKey("accounts.account_id"), nullable=False, index=True)
    transaction_id = Column(String, ForeignKey("transactions.transaction_id"), nullable=True, index=True)
    incident_type = Column(String, nullable=False)
    # SUSPICIOUS_TRANSACTION, FRAUD_REPORT, SCAM_VICTIM, MULE_SUSPECTED
    status = Column(String, default="FLAGGED", index=True)
    # FLAGGED, UNDER_INVESTIGATION, CONFIRMED_FRAUD, FALSE_POSITIVE, CLEARED, VICTIM
    severity = Column(String, default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution = Column(String, nullable=True)

    account = relationship("Account", back_populates="incidents")
    transaction = relationship("Transaction", back_populates="incidents")
