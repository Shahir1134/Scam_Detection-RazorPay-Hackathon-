import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    print("GET /health:", res.status_code, res.json())
    assert res.status_code == 200

def test_dashboard_stats():
    res = client.get("/api/v1/dashboard/stats")
    print("GET /api/v1/dashboard/stats:", res.status_code)
    data = res.json()
    print(" - Total Analyzed:", data.get("total_analyzed"))
    print(" - Risk Distribution:", data.get("risk_distribution"))
    print(" - High Risk Count:", data.get("high_risk_count"))
    assert res.status_code == 200

def test_analyze_demo_transaction():
    # The primary demo scenario: ₹85,000 TRANSFER from ACC037 (victim) to ACC038 (mule)
    payload = {
        "amount": 85000,
        "type": "TRANSFER",
        "sender_account": "ACC037",
        "receiver_account": "ACC038"
    }
    res = client.post("/api/v1/transactions/analyze", json=payload)
    print("\nPOST /api/v1/transactions/analyze (DEMO SCENARIO):", res.status_code)
    data = res.json()
    print(" - Transaction ID:", data.get("transaction_id"))
    print(" - Fraud Probability:", data.get("fraud_probability"))
    print(" - Risk Level:", data.get("risk_level"))
    print(" - Investigation Risk Score:", data.get("investigation_risk"))
    
    breakdown = data.get("risk_breakdown", [])
    print(" - Number of Risk Components:", len(breakdown))
    
    total_score = 0.0
    total_max = 0.0
    for comp in breakdown:
        print(f"   • {comp['name']}: {comp['score']}/{comp['max_score']} pts | {comp['summary']}")
        assert "evidence" in comp, f"Missing evidence in {comp['name']}"
        assert len(comp["evidence"]) > 0, f"Evidence dictionary is empty for {comp['name']}"
        total_score += comp["score"]
        total_max += comp["max_score"]

    # Verify Mathematical Invariants
    print(f" - Sum of component maximums: {total_max} (Must be exactly 100.0)")
    assert total_max == 100.0, f"Total max components should sum to 100.0, got {total_max}"
    
    calculated_round = int(round(total_score))
    print(f" - Sum of component scores: {total_score} -> rounded {calculated_round}")
    assert calculated_round == data.get("investigation_risk"), f"Sum mismatch: {calculated_round} vs {data.get('investigation_risk')}"
    
    explanation = data.get("investigator_explanation")
    assert explanation is not None
    print(" - Investigator Headline:", explanation.get("headline"))
    print(" - Investigator Summary:", explanation.get("summary"))
    print(" - ML Signal Level:", explanation.get("ml_signal_level"))
    print(" - Investigation Intel Level:", explanation.get("investigation_intel_level"))

    assert res.status_code == 200
    assert data.get("risk_level") in ("HIGH", "CRITICAL")
    return data.get("transaction_id")

def test_get_transaction_detail(txn_id):
    res = client.get(f"/api/v1/transactions/{txn_id}")
    print(f"\nGET /api/v1/transactions/{txn_id}:", res.status_code)
    data = res.json()
    print(" - Transaction ID:", data.get("transaction_id"))
    print(" - Investigation Risk:", data.get("investigation_risk"))
    print(" - Risk Breakdown Components:", len(data.get("risk_breakdown", [])))
    assert res.status_code == 200
    assert len(data.get("risk_breakdown", [])) == 5
    assert data.get("investigator_explanation") is not None

def test_list_accounts():
    res = client.get("/api/v1/accounts/?page=1&page_size=10")
    print("\nGET /api/v1/accounts/:", res.status_code)
    data = res.json()
    print(" - Total Accounts:", data.get("total"))
    print(" - Items Count:", len(data.get("items", [])))
    assert res.status_code == 200
    assert data.get("total", 0) > 0

def test_account_investigation():
    # Investigate recipient ACC038
    res = client.get("/api/v1/accounts/ACC038")
    print("\nGET /api/v1/accounts/ACC038 (MULE ACCOUNT INVESTIGATION):", res.status_code)
    data = res.json()
    print(" - Masked ID:", data.get("masked_account_id"))
    print(" - Risk Score:", data.get("risk_score"))
    print(" - Mule Score:", data.get("mule_info", {}).get("mule_score"))
    print(" - Mule Signals:", data.get("mule_info", {}).get("signals"))
    print(" - Unique Senders:", data.get("behavioral_stats", {}).get("unique_senders"))
    assert res.status_code == 200

def test_account_network():
    # Graph network for ACC038
    res = client.get("/api/v1/accounts/ACC038/network?depth=2")
    print("\nGET /api/v1/accounts/ACC038/network:", res.status_code)
    data = res.json()
    print(" - Graph Nodes:", len(data.get("nodes", [])))
    print(" - Graph Edges:", len(data.get("edges", [])))
    print(" - Network Summary:", data.get("summary"))
    assert res.status_code == 200

def test_case_workflow(txn_id):
    # Create Case
    create_payload = {
        "transaction_id": txn_id,
        "notes": "Suspicious high-value transfer to known mule account with auditable component breakdown.",
        "assigned_investigator": "Shahir Ali"
    }
    res = client.post("/api/v1/cases/", json=create_payload)
    print("\nPOST /api/v1/cases/:", res.status_code)
    case_data = res.json()
    case_id = case_data.get("case_id")
    print(" - Created Case ID:", case_id)
    assert res.status_code == 200

    # Add Action to Case
    action_payload = {
        "action": "ESCALATE",
        "investigator": "Shahir Ali",
        "details": "Customer verification initiated. Recipient network involves multiple mule hops. Escalated to fraud ops team."
    }
    action_res = client.post(f"/api/v1/cases/{case_id}/actions", json=action_payload)
    print(f"POST /api/v1/cases/{case_id}/actions (ESCALATE):", action_res.status_code)
    updated_case = action_res.json()
    print(" - New Status:", updated_case.get("status"))
    print(" - Audit Log Entries:", len(updated_case.get("audit_log", [])))
    assert action_res.status_code == 200
    assert updated_case.get("status") == "ESCALATED"

if __name__ == "__main__":
    print("Running Full Backend End-to-End API Verification...")
    test_health()
    test_dashboard_stats()
    test_list_accounts()
    txn_id = test_analyze_demo_transaction()
    test_get_transaction_detail(txn_id)
    test_account_investigation()
    test_account_network()
    test_case_workflow(txn_id)
    print("\n=================================================================")
    print(" [SUCCESS] All Explainable Risk & API Invariants Verified! ")
    print("=================================================================")
