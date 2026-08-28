from sqlalchemy import Column, String, Date, DateTime, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Account(Base):
    __tablename__ = "accounts"

    account_id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False)
    account_type = Column(String, default="SAVINGS")  # SAVINGS, CURRENT, WALLET
    account_open_date = Column(Date, nullable=True)
    status = Column(String, default="ACTIVE")  # ACTIVE, FROZEN, CLOSED
    balance = Column(Float, default=0.0)
    risk_score = Column(Integer, default=0)  # 0-100
    risk_status = Column(String, default="NORMAL")  # NORMAL, MONITORED, HIGH_RISK
    location_city = Column(String, nullable=True)
    location_state = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="accounts")
    sent_transactions = relationship(
        "Transaction", foreign_keys="Transaction.sender_account_id", back_populates="sender"
    )
    received_transactions = relationship(
        "Transaction", foreign_keys="Transaction.receiver_account_id", back_populates="receiver"
    )
    incidents = relationship("Incident", back_populates="account")
    cases = relationship("Case", back_populates="primary_account")
