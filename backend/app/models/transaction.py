from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String, primary_key=True, index=True)
    sender_account_id = Column(String, ForeignKey("accounts.account_id"), nullable=False, index=True)
    receiver_account_id = Column(String, ForeignKey("accounts.account_id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False)  # TRANSFER, CASH_OUT, CASH_IN, PAYMENT, DEBIT
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String, default="COMPLETED")  # COMPLETED, PENDING, FLAGGED, BLOCKED

    # ML analysis fields
    fraud_probability = Column(Float, nullable=True)
    risk_score = Column(Integer, nullable=True)
    risk_level = Column(String, nullable=True, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    is_analyzed = Column(Boolean, default=False, index=True)
    risk_factors = Column(JSON, nullable=True)
    shap_values = Column(JSON, nullable=True)

    # PaySim balance fields (for model features)
    step = Column(Integer, default=1)
    oldbalance_sender = Column(Float, default=0.0)
    newbalance_sender = Column(Float, default=0.0)
    oldbalance_receiver = Column(Float, default=0.0)
    newbalance_receiver = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("Account", foreign_keys=[sender_account_id], back_populates="sent_transactions")
    receiver = relationship("Account", foreign_keys=[receiver_account_id], back_populates="received_transactions")
    incidents = relationship("Incident", back_populates="transaction")
    cases = relationship("Case", back_populates="transaction")
