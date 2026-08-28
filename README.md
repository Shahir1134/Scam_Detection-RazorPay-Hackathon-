🛡️ AI Scam Detection & Investigation Platform

«Detect → Explain → Investigate → Trace»

An AI-powered fraud investigation platform built for the Razorpay Hackathon 2026 — AI Risk Manager Track.

Most fraud systems stop at “this transaction looks suspicious.”

This platform goes further — helping investigators understand why it was flagged, who is involved, where the money moved, and whether it connects to a larger fraud network.

---

🚀 How It Works

Transaction
     ↓
XGBoost Fraud Model
     ↓
Fraud Probability
     ↓
Risk + Behavioral Analysis
     ↓
Account Intelligence
     ↓
Transaction Graph
     ↓
Mule / Fraud Network Detection
     ↓
Investigation Case

---

🔥 Key Features

- 🤖 XGBoost Fraud Detection — Existing PaySim-trained model
- 🧠 Risk Explanation — ML + behavioral signals
- 👤 Account Intelligence — History, behavior & incidents
- ⚡ Velocity Analysis — Detect unusual transaction patterns
- 🕸️ Fraud Network Graph — Trace connected accounts
- 🐴 Mule Detection — Identify potential mule-account behavior
- 💸 Money Flow Tracking — Follow movement of funds
- 📂 Investigation Cases — Turn alerts into actionable cases
- 🔐 Responsible AI — Synthetic data, masked PII & human-in-the-loop

---

🧠 ML Model

The platform uses my existing XGBoost model trained on the PaySim dataset as its core detection engine.

PaySim

PaySim is a large-scale synthetic mobile-money transaction dataset designed for financial fraud research, containing ~6.3 million transactions with only a small fraction representing fraudulent activity.

This scale and class imbalance make fraud detection a challenging problem — and a good testbed for building an investigation layer around transaction-level predictions.

Model Performance

On my evaluation:

Class| Precision| Recall
Fraud (1)| ~0.25| ~0.95
Non-Fraud (0)| ~1.00| ~1.00

The model is intentionally tuned toward high fraud recall, meaning it prioritizes catching suspicious transactions even at the cost of more false positives.

That's where the investigation platform becomes important:

«The model casts a wide net. The investigation layer provides the context needed to separate genuine risk from false positives.»

Transaction
    ↓
Existing Preprocessing
    ↓
XGBoost
    ↓
Fraud Probability
    ↓
Investigation Intelligence

---

🕸️ Example Investigation

₹85,000 Transaction
       ↓
94% Fraud Probability
       ↓
CRITICAL
       ↓
Unusual Amount
New Recipient
Abnormal Behavior
       ↓
Recipient Investigation
       ↓
Suspicious Account History
       ↓
Fraud Network
       ↓
Trace Money Flow
       ↓
Create Investigation Case

---

🛠️ Tech Stack

Backend: Python · FastAPI · SQLAlchemy · Pydantic

ML: XGBoost · scikit-learn · SHAP

Database: PostgreSQL

Graph: NetworkX

Frontend: React · TypeScript · Vite · Tailwind CSS · React Flow · Recharts

---

🔌 API

POST /api/v1/transactions/analyze
GET  /api/v1/transactions/{id}
GET  /api/v1/accounts/{id}
GET  /api/v1/accounts/{id}/transactions
GET  /api/v1/accounts/{id}/incidents
GET  /api/v1/accounts/{id}/network
POST /api/v1/cases
GET  /api/v1/cases/{id}
POST /api/v1/cases/{id}/actions

---

🔐 Responsible AI

The system does not label people as criminals or automatically take high-impact actions.

AI: Detect → Explain → Recommend

Investigator: Investigate → Verify → Escalate → Resolve

All prototype customer data is synthetic and sensitive information is masked.

---

🎯 The Goal

«Don't just tell investigators that a transaction is suspicious. Give them the intelligence to understand the entire story behind it.»

DETECT → EXPLAIN → INVESTIGATE → TRACE
