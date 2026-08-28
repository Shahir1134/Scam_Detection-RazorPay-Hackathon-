"""
Synthetic bank data seeder.
Generates realistic fake data for all 5 scenarios needed for the hackathon demo.
Run: python -m app.seed.seed_data
"""

import sys
import os
import uuid
import random
from datetime import datetime, timedelta, date

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from faker import Faker
from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.incident import Incident
from app.models.case import Case

fake = Faker("en_IN")
random.seed(42)

CITIES = [
    ("Mumbai", "Maharashtra"), ("Delhi", "Delhi"), ("Bengaluru", "Karnataka"),
    ("Chennai", "Tamil Nadu"), ("Hyderabad", "Telangana"), ("Kolkata", "West Bengal"),
    ("Pune", "Maharashtra"), ("Ahmedabad", "Gujarat"), ("Jaipur", "Rajasthan"),
    ("Lucknow", "Uttar Pradesh"),
]

TX_TYPES = ["TRANSFER", "CASH_OUT", "CASH_IN", "PAYMENT", "DEBIT"]


def fake_phone():
    digits = "".join([str(random.randint(0, 9)) for _ in range(10)])
    return f"+91{digits}"


def fake_account_id(n):
    return f"ACC{str(n).zfill(3)}"


def fake_customer_id(n):
    return f"CUST{str(n).zfill(3)}"


def fake_txn_id():
    return f"TXN{uuid.uuid4().hex[:8].upper()}"


def fake_incident_id():
    return f"INC{uuid.uuid4().hex[:8].upper()}"


def random_city():
    return random.choice(CITIES)


def make_customer(db, n, kyc="VERIFIED"):
    from app.models.customer import Customer
    city, state = random_city()
    c = Customer(
        customer_id=fake_customer_id(n),
        name=fake.name(),
        kyc_status=kyc,
        account_open_date=date.today() - timedelta(days=random.randint(90, 1800)),
        registered_phone=fake_phone(),
        registered_address=f"{fake.building_number()}, {fake.street_name()}, {city}, {state} - {fake.postcode()}",
        created_at=datetime.utcnow() - timedelta(days=random.randint(90, 1800)),
    )
    db.add(c)
    return c


def make_account(db, account_id, customer_id, balance, risk_score=5, risk_status="NORMAL",
                 account_type="SAVINGS", days_old=365, city=None, state=None):
    from app.models.account import Account
    if city is None:
        city, state = random_city()
    open_date = date.today() - timedelta(days=days_old)
    a = Account(
        account_id=account_id,
        customer_id=customer_id,
        account_type=account_type,
        account_open_date=open_date,
        status="ACTIVE",
        balance=balance,
        risk_score=risk_score,
        risk_status=risk_status,
        location_city=city,
        location_state=state,
        created_at=datetime.utcnow() - timedelta(days=days_old),
    )
    db.add(a)
    return a


def make_transaction(db, txn_id, sender_id, receiver_id, amount, tx_type="TRANSFER",
                     days_ago=1, hours_ago=0, risk_level=None, risk_score=None,
                     fraud_prob=None, is_analyzed=False, step=1,
                     old_bal_s=0, new_bal_s=0, old_bal_r=0, new_bal_r=0):
    from app.models.transaction import Transaction
    ts = datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago)
    status = "FLAGGED" if risk_level in ("HIGH", "CRITICAL") else "COMPLETED"
    t = Transaction(
        transaction_id=txn_id,
        sender_account_id=sender_id,
        receiver_account_id=receiver_id,
        amount=amount,
        transaction_type=tx_type,
        timestamp=ts,
        status=status,
        fraud_probability=fraud_prob,
        risk_score=risk_score,
        risk_level=risk_level,
        is_analyzed=is_analyzed,
        risk_factors=None,
        step=step,
        oldbalance_sender=old_bal_s,
        newbalance_sender=new_bal_s,
        oldbalance_receiver=old_bal_r,
        newbalance_receiver=new_bal_r,
        created_at=ts,
    )
    db.add(t)
    return t


def make_incident(db, account_id, transaction_id, incident_type, status, severity, description, days_ago=0):
    from app.models.incident import Incident
    i = Incident(
        incident_id=fake_incident_id(),
        account_id=account_id,
        transaction_id=transaction_id,
        incident_type=incident_type,
        status=status,
        severity=severity,
        description=description,
        created_at=datetime.utcnow() - timedelta(days=days_ago),
    )
    db.add(i)
    return i


def seed(db: Session):
    print("\n========================================")
    print("  ScamDetect — Seeding Synthetic Data")
    print("========================================\n")

    # ─── SCENARIO 1: Normal accounts (ACC001–ACC020) ──────────────────────────
    print("[1/6] Creating 20 normal customer accounts...")
    normal_account_ids = []
    for i in range(1, 21):
        c = make_customer(db, i)
        acc_id = fake_account_id(i)
        balance = random.uniform(20000, 250000)
        make_account(db, acc_id, c.customer_id, balance, risk_score=random.randint(2, 15),
                     days_old=random.randint(180, 900))
        normal_account_ids.append(acc_id)

        # Historical transactions: 30 days of small transactions
        for d in range(30, 0, -1):
            num_tx = random.randint(0, 3)
            for _ in range(num_tx):
                target = random.choice(normal_account_ids + [fake_account_id(random.randint(1, 20))])
                if target == acc_id:
                    continue
                amt = round(random.uniform(200, 5000), 2)
                make_transaction(
                    db, fake_txn_id(), acc_id, target, amt,
                    tx_type=random.choice(["TRANSFER", "PAYMENT", "DEBIT"]),
                    days_ago=d, hours_ago=random.randint(0, 23),
                    step=random.randint(1, 744),
                    old_bal_s=balance, new_bal_s=balance - amt,
                    old_bal_r=50000, new_bal_r=50000 + amt,
                )
    db.flush()
    print(f"   [OK] 20 normal accounts seeded")

    # ─── SCENARIO 2: Scam victims (ACC021–ACC023) ──────────────────────────────
    print("[2/6] Creating 3 scam victim accounts...")
    victim_ids = []
    for i in range(21, 24):
        c = make_customer(db, i)
        acc_id = fake_account_id(i)
        balance = random.uniform(80000, 200000)
        make_account(db, acc_id, c.customer_id, balance, risk_score=10,
                     days_old=random.randint(400, 900))
        victim_ids.append(acc_id)

        # Normal history
        for d in range(30, 2, -1):
            if random.random() < 0.4:
                amt = round(random.uniform(300, 3000), 2)
                target = random.choice(normal_account_ids)
                make_transaction(db, fake_txn_id(), acc_id, target, amt,
                                 tx_type="PAYMENT", days_ago=d, step=random.randint(1, 744),
                                 old_bal_s=balance, new_bal_s=balance - amt,
                                 old_bal_r=30000, new_bal_r=30000 + amt)

        # The anomalous scam payment (to a mule — will be ACC024-026)
        scam_amount = round(random.uniform(50000, 120000), 2)
        scam_txn_id = fake_txn_id()
        make_transaction(
            db, scam_txn_id, acc_id, "ACC025",
            scam_amount, tx_type="TRANSFER", days_ago=1,
            risk_level="CRITICAL", risk_score=88, fraud_prob=0.921,
            is_analyzed=True, step=42,
            old_bal_s=balance, new_bal_s=balance - scam_amount,
            old_bal_r=15000, new_bal_r=15000 + scam_amount,
        )
        make_incident(db, acc_id, scam_txn_id, "SCAM_VICTIM", "VICTIM", "HIGH",
                      f"Account appears to be victim of social engineering scam. INR {scam_amount:,.0f} sent to suspected mule account.")

    db.flush()
    print(f"   [OK] 3 scam victim accounts seeded")

    # ─── SCENARIO 3: Mule accounts (ACC024–ACC026) ──────────────────────────────
    print("[3/6] Creating 3 mule accounts...")
    mule_ids = []
    for i, (risk_s, mule_label) in enumerate([(91, "VERY HIGH"), (78, "HIGH"), (65, "HIGH")]):
        acc_no = i + 24
        c = make_customer(db, acc_no, kyc="PENDING")
        acc_id = fake_account_id(acc_no)
        make_account(db, acc_id, c.customer_id, random.uniform(2000, 8000),
                     risk_score=risk_s, risk_status="HIGH_RISK",
                     days_old=random.randint(7, 21))
        mule_ids.append(acc_id)

        # 50–80 incoming from diverse sources
        num_incoming = random.randint(50, 80)
        incoming_sources = [fake_account_id(random.randint(1, 20)) for _ in range(num_incoming)]
        for j, src in enumerate(incoming_sources):
            amt = round(random.uniform(1000, 15000), 2)
            make_transaction(
                db, fake_txn_id(), src, acc_id, amt,
                tx_type="TRANSFER", days_ago=random.randint(1, 14),
                hours_ago=random.randint(0, 23), step=random.randint(1, 744),
                risk_level="MEDIUM" if j % 3 == 0 else None,
                old_bal_s=50000, new_bal_s=50000 - amt,
                old_bal_r=10000 + j * 1000, new_bal_r=10000 + j * 1000 + amt,
            )

        # Rapid outgoing to 8–12 accounts
        num_outgoing = random.randint(8, 12)
        for k in range(num_outgoing):
            target = fake_account_id(random.randint(30, 50))
            amt = round(random.uniform(5000, 40000), 2)
            make_transaction(
                db, fake_txn_id(), acc_id, target, amt,
                tx_type="TRANSFER", days_ago=0, hours_ago=random.randint(1, 12),
                step=random.randint(300, 400),
                old_bal_s=80000, new_bal_s=80000 - amt,
                old_bal_r=5000, new_bal_r=5000 + amt,
            )

        # Previous incidents
        for _ in range(random.randint(3, 9)):
            make_incident(db, acc_id, None, "SUSPICIOUS_TRANSACTION",
                          random.choice(["FLAGGED", "UNDER_INVESTIGATION", "CONFIRMED_FRAUD"]),
                          "HIGH", "Account flagged for unusual transaction pattern",
                          days_ago=random.randint(1, 14))

    db.flush()
    print(f"   [OK] 3 mule accounts seeded")

    # ─── SCENARIO 4: Fraud network (ACC027–ACC034) ──────────────────────────────
    print("[4/6] Creating fraud network (8 connected accounts)...")
    # Structure: 3 victims → 2 mules → 2 forwarding → 1 cashout
    net_victims = ["ACC027", "ACC028", "ACC029"]
    net_mules = ["ACC030", "ACC031"]
    net_fwd = ["ACC032", "ACC033"]
    net_cashout = ["ACC034"]
    net_all = net_victims + net_mules + net_fwd + net_cashout

    for i, acc_id in enumerate(net_all):
        n = 27 + i
        c = make_customer(db, n, kyc="PENDING" if i > 2 else "VERIFIED")
        if i < 3:  # victims
            make_account(db, acc_id, c.customer_id, random.uniform(50000, 150000),
                         risk_score=15, days_old=random.randint(300, 700))
        elif i < 5:  # mules
            make_account(db, acc_id, c.customer_id, 5000, risk_score=88,
                         risk_status="HIGH_RISK", days_old=random.randint(5, 15))
        elif i < 7:  # forwarding
            make_account(db, acc_id, c.customer_id, 3000, risk_score=72,
                         risk_status="HIGH_RISK", days_old=random.randint(10, 25))
        else:  # cashout
            make_account(db, acc_id, c.customer_id, 2000, risk_score=95,
                         risk_status="HIGH_RISK", days_old=random.randint(3, 8))

    # Money flow within 2 hours (10:01–12:01 today)
    base_time = datetime.utcnow().replace(hour=4, minute=31)  # 10:01 IST

    # Victims → mules
    flow_txns = [
        ("ACC027", "ACC030", 85000, 0),
        ("ACC028", "ACC030", 42000, 2),
        ("ACC029", "ACC031", 67000, 3),
        # Mules → forwarding
        ("ACC030", "ACC032", 70000, 18),
        ("ACC031", "ACC032", 30000, 21),
        ("ACC030", "ACC033", 50000, 24),
        # Forwarding → cashout
        ("ACC032", "ACC034", 90000, 55),
        ("ACC033", "ACC034", 45000, 61),
        ("ACC034", "ACC027", 5000, 90),  # decoy return
    ]

    for sender, receiver, amount, minutes_offset in flow_txns:
        ts = base_time + timedelta(minutes=minutes_offset)
        minutes_ago = int((datetime.utcnow() - ts).total_seconds() / 60)
        t = Transaction(
            transaction_id=fake_txn_id(),
            sender_account_id=sender,
            receiver_account_id=receiver,
            amount=float(amount),
            transaction_type="TRANSFER",
            timestamp=ts,
            status="FLAGGED",
            fraud_probability=round(random.uniform(0.88, 0.99), 3),
            risk_score=random.randint(88, 98),
            risk_level="CRITICAL",
            is_analyzed=True,
            risk_factors=["High-value transfer", "Connected to fraud network"],
            step=random.randint(250, 300),
            oldbalance_sender=amount + 5000,
            newbalance_sender=5000.0,
            oldbalance_receiver=5000.0,
            newbalance_receiver=5000.0 + amount,
        )
        db.add(t)

    # Incidents for network accounts
    for acc_id in net_mules + net_fwd + net_cashout:
        make_incident(db, acc_id, None, "MULE_SUSPECTED", "CONFIRMED_FRAUD",
                      "CRITICAL", "Account identified as part of layered fraud network.")

    db.flush()
    print(f"   [OK] Fraud network seeded (8 accounts, 9 transactions)")

    # ─── SCENARIO 5: False positives (ACC035–ACC036) ──────────────────────────
    print("[5/6] Creating 2 false positive accounts...")
    for i in range(35, 37):
        c = make_customer(db, i)
        acc_id = fake_account_id(i)
        make_account(db, acc_id, c.customer_id, random.uniform(500000, 2000000),
                     risk_score=8, days_old=random.randint(500, 1500),
                     account_type="CURRENT")

        # Large legit transaction
        fp_amount = round(random.uniform(200000, 800000), 2)
        fp_txn = fake_txn_id()
        make_transaction(
            db, fp_txn, acc_id, fake_account_id(random.randint(1, 10)), fp_amount,
            tx_type="TRANSFER", days_ago=5, risk_level="HIGH", risk_score=72,
            fraud_prob=0.71, is_analyzed=True, step=120,
            old_bal_s=1500000, new_bal_s=1500000 - fp_amount,
            old_bal_r=100000, new_bal_r=100000 + fp_amount,
        )
        inc = make_incident(db, acc_id, fp_txn, "SUSPICIOUS_TRANSACTION",
                            "FALSE_POSITIVE", "MEDIUM",
                            "Large transfer initially flagged. Customer confirmed legitimate business payment.")
        inc.resolved_at = datetime.utcnow() - timedelta(days=3)
        inc.resolution = "Verified with customer. Legitimate inter-company transfer. No further action."

    db.flush()
    print(f"   [OK] 2 false positive accounts seeded")

    # ─── SCENARIO 6: DEMO accounts (ACC037 = victim, ACC038 = mule) ──────────
    print("[6/6] Creating PRIMARY DEMO accounts (ACC037 -> ACC038)...")

    # ACC037: Normal customer with months of small transactions
    c37 = make_customer(db, 37)
    make_account(db, "ACC037", c37.customer_id, 115000.0, risk_score=12,
                 risk_status="NORMAL", days_old=547)

    # 45 days of normal history
    for d in range(45, 1, -1):
        num = random.randint(1, 3)
        for _ in range(num):
            amt = round(random.uniform(300, 2500), 2)
            target = fake_account_id(random.randint(1, 20))
            make_transaction(db, fake_txn_id(), "ACC037", target, amt,
                             tx_type=random.choice(["PAYMENT", "TRANSFER", "DEBIT"]),
                             days_ago=d, hours_ago=random.randint(6, 22),
                             step=random.randint(1, 744),
                             old_bal_s=115000, new_bal_s=115000 - amt,
                             old_bal_r=30000, new_bal_r=30000 + amt)

    # ACC038: Mule account — many incoming, rapid outgoing, 9 past flags
    c38 = make_customer(db, 38, kyc="PENDING")
    make_account(db, "ACC038", c38.customer_id, 8000.0, risk_score=91,
                 risk_status="HIGH_RISK", days_old=11)

    # 73 unique senders to ACC038
    for j in range(73):
        src = fake_account_id(random.randint(1, 36))
        if src == "ACC038":
            src = "ACC001"
        amt = round(random.uniform(500, 18000), 2)
        make_transaction(db, fake_txn_id(), src, "ACC038", amt,
                         tx_type="TRANSFER", days_ago=random.randint(1, 10),
                         hours_ago=random.randint(0, 23), step=random.randint(1, 744),
                         old_bal_s=50000, new_bal_s=50000 - amt,
                         old_bal_r=5000, new_bal_r=5000 + amt)

    # 41 outgoing from ACC038
    for k in range(41):
        target = fake_account_id(random.randint(30, 50))
        amt = round(random.uniform(2000, 25000), 2)
        make_transaction(db, fake_txn_id(), "ACC038", target, amt,
                         tx_type="TRANSFER", days_ago=random.randint(0, 5),
                         hours_ago=random.randint(0, 20), step=random.randint(200, 500),
                         old_bal_s=80000, new_bal_s=80000 - amt,
                         old_bal_r=5000, new_bal_r=5000 + amt)

    # 9 previous incidents on ACC038
    incident_types = [
        ("SUSPICIOUS_TRANSACTION", "CONFIRMED_FRAUD", "CRITICAL", 3),
        ("SUSPICIOUS_TRANSACTION", "CONFIRMED_FRAUD", "HIGH", 5),
        ("MULE_SUSPECTED", "UNDER_INVESTIGATION", "CRITICAL", 7),
        ("SUSPICIOUS_TRANSACTION", "FLAGGED", "HIGH", 8),
        ("SUSPICIOUS_TRANSACTION", "FLAGGED", "HIGH", 9),
        ("SUSPICIOUS_TRANSACTION", "FLAGGED", "MEDIUM", 10),
        ("FRAUD_REPORT", "UNDER_INVESTIGATION", "CRITICAL", 2),
        ("SUSPICIOUS_TRANSACTION", "CONFIRMED_FRAUD", "CRITICAL", 1),
        ("MULE_SUSPECTED", "FLAGGED", "HIGH", 0),
    ]
    for inc_type, status, severity, days in incident_types:
        make_incident(db, "ACC038", None, inc_type, status, severity,
                      f"Account flagged for {inc_type.lower().replace('_', ' ')}.", days_ago=days)

    db.flush()
    print(f"   [OK] Demo accounts ACC037 and ACC038 seeded")
    print(f"     ACC037: Normal sender (45 days history, avg INR 300-2,500)")
    print(f"     ACC038: Mule recipient (11 days old, 73 senders, 41 outgoing, 9 incidents)")
    print(f"\n   [DEMO] POST /api/v1/transactions/analyze")
    print(f"     {{\"amount\": 85000, \"type\": \"TRANSFER\", \"sender_account\": \"ACC037\", \"receiver_account\": \"ACC038\"}}")

    db.commit()

    # Summary
    from app.models.transaction import Transaction as TxnModel
    from app.models.account import Account as AccModel
    from app.models.incident import Incident as IncModel

    txn_count = db.query(TxnModel).count()
    acc_count = db.query(AccModel).count()
    inc_count = db.query(IncModel).count()

    print(f"\n==========================================")
    print(f"  Seed complete!")
    print(f"  Accounts:     {acc_count}")
    print(f"  Transactions: {txn_count}")
    print(f"  Incidents:    {inc_count}")
    print(f"==========================================\n")


if __name__ == "__main__":
    from app.database import SessionLocal, create_all_tables
    create_all_tables()
    db = SessionLocal()
    try:
        seed(db)
    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] Seeding failed: {e}")
        raise
    finally:
        db.close()

