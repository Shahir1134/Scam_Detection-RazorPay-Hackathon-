from sqlalchemy import Column, String, Date, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    kyc_status = Column(String, default="PENDING")  # VERIFIED, PENDING, FAILED
    account_open_date = Column(Date, nullable=True)
    registered_phone = Column(String, nullable=True)
    registered_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="customer")
