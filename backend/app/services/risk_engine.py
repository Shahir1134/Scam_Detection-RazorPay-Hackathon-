"""
Explainable Risk Engine
Translates ML model probability and multidimensional banking evidence into an
auditable, deterministic 0–100 Investigation Risk score with exact component breakdown.
"""

from typing import Dict, List, Optional, Any
from app.config import settings


def probability_to_risk_level(prob: float, composite_score: Optional[int] = None) -> str:
    """
    Map Investigation Risk score (0-100) to a named risk level.
    The final risk level is derived solely from the Investigation Risk score.
    """
    score = composite_score if composite_score is not None else int(prob * 100)
    if score >= 85:
        return "CRITICAL"
    elif score >= 60:
        return "HIGH"
    elif score >= 30:
        return "MEDIUM"
    else:
        return "LOW"


def probability_to_risk_score(prob: float) -> int:
    """Convert probability to 0-100 integer score."""
    if prob >= settings.MODEL_FRAUD_THRESHOLD:
        return max(95, int(prob * 100))
    return min(100, int(prob * 100))


def calculate_explainable_risk_breakdown(
    fraud_probability: float,
    amount: float,
    tx_type: str,
    sender_account_id: str,
    receiver_account_id: str,
    sender_balance: float,
    receiver_balance: float,
    historical_avg: float,
    historical_std: float,
    is_new_recipient: bool,
    sender_incident_count: int,
    receiver_incident_count: int,
    receiver_age_days: int,
    receiver_kyc_status: str,
    receiver_mule_score: int,
    receiver_unique_senders: int,
    connected_high_risk: int,
    pass_through_rate: float,
    velocity_5min: int,
    velocity_1hr: int,
) -> Dict[str, Any]:
    """
    Deterministic Explainable Scoring Model
    Total Max Score = Exactly 100 points:
      - Transaction Anomaly:     0 to 25 pts
      - Recipient Intelligence:  0 to 25 pts
      - Sender Behavioral Risk:  0 to 20 pts
      - Network & Mule Risk:     0 to 15 pts
      - ML Model Signal:         0 to 15 pts
    """
    components = []

    # ─────────────────────────────────────────────────────────────
    # 1. TRANSACTION ANOMALY (0 - 25 pts)
    # ─────────────────────────────────────────────────────────────
    anom_score = 0.0
    anom_notes = []
    ratio = (amount / historical_avg) if historical_avg > 0 else 0.0

    if historical_avg > 0 and ratio >= 1.5:
        if ratio >= 10.0:
            anom_score += 18.0
            anom_notes.append(f"Amount (INR {amount:,.0f}) is {ratio:.1f}x above sender's average (INR {historical_avg:,.0f})")
        elif ratio >= 5.0:
            anom_score += 14.0
            anom_notes.append(f"Amount (INR {amount:,.0f}) is {ratio:.1f}x above sender's average (INR {historical_avg:,.0f})")
        elif ratio >= 2.5:
            anom_score += 8.0
            anom_notes.append(f"Amount (INR {amount:,.0f}) is {ratio:.1f}x above sender's average")
        elif ratio >= 1.5:
            anom_score += 4.0
            anom_notes.append(f"Amount (INR {amount:,.0f}) is moderately elevated vs average")
    elif amount >= 75000:
        anom_score += 18.0
        anom_notes.append(f"High-value transfer amount: INR {amount:,.0f}")
    elif amount >= 40000:
        anom_score += 12.0
        anom_notes.append(f"Elevated transfer amount: INR {amount:,.0f}")
    elif amount >= 20000:
        anom_score += 6.0

    if is_new_recipient:
        anom_score += 4.0
        anom_notes.append("First-ever transaction to this recipient")

    if tx_type in ("TRANSFER", "CASH_OUT") and amount >= 25000:
        anom_score += 3.0
        anom_notes.append(f"High-risk {tx_type.replace('_', ' ').title()} type")

    anom_score = min(25.0, round(anom_score, 1))
    components.append({
        "name": "Transaction Anomaly",
        "key": "transaction_anomaly",
        "score": anom_score,
        "max_score": 25.0,
        "summary": "; ".join(anom_notes) if anom_notes else "Transaction amount within normal sender baseline.",
        "evidence": {
            "amount": amount,
            "sender_historical_avg": round(historical_avg, 2),
            "amount_ratio_vs_avg": round(ratio, 1) if ratio > 0 else 1.0,
            "is_new_recipient": is_new_recipient,
            "transaction_type": tx_type,
        },
        "significance": "Measures unexpected spikes in transaction size or destination novelty against historic baseline.",
    })

    # ─────────────────────────────────────────────────────────────
    # 2. RECIPIENT INTELLIGENCE (0 - 25 pts)
    # ─────────────────────────────────────────────────────────────
    recip_score = 0.0
    recip_notes = []

    if receiver_age_days <= 7:
        recip_score += 10.0
        recip_notes.append(f"Account is very new ({receiver_age_days} days old)")
    elif receiver_age_days <= 14:
        recip_score += 8.0
        recip_notes.append(f"Account is new ({receiver_age_days} days old)")
    elif receiver_age_days <= 30:
        recip_score += 5.0
        recip_notes.append(f"Account opened recently ({receiver_age_days} days old)")
    elif receiver_age_days <= 90:
        recip_score += 2.0

    if receiver_incident_count >= 5:
        recip_score += 10.0
        recip_notes.append(f"{receiver_incident_count} prior fraud incidents on record")
    elif receiver_incident_count >= 2:
        recip_score += 7.0
        recip_notes.append(f"{receiver_incident_count} prior fraud incidents on record")
    elif receiver_incident_count >= 1:
        recip_score += 4.0
        recip_notes.append(f"{receiver_incident_count} prior incident flag")

    if str(receiver_kyc_status).upper() in ("PENDING", "UNVERIFIED", "UNKNOWN"):
        recip_score += 5.0
        recip_notes.append(f"KYC status is {receiver_kyc_status}")

    if receiver_mule_score >= 80:
        recip_score += 2.0
        recip_notes.append("High mule risk profile")

    recip_score = min(25.0, round(recip_score, 1))
    components.append({
        "name": "Recipient Intelligence",
        "key": "recipient_intelligence",
        "score": recip_score,
        "max_score": 25.0,
        "summary": "; ".join(recip_notes) if recip_notes else "Recipient account verified with established history.",
        "evidence": {
            "receiver_account": receiver_account_id,
            "account_age_days": receiver_age_days,
            "incident_count": receiver_incident_count,
            "kyc_status": receiver_kyc_status,
            "mule_profile_score": receiver_mule_score,
        },
        "significance": "Identifies recipient profile risks including recent account creation, pending KYC, and incident records.",
    })

    # ─────────────────────────────────────────────────────────────
    # 3. SENDER BEHAVIORAL RISK (0 - 20 pts)
    # ─────────────────────────────────────────────────────────────
    behav_score = 0.0
    behav_notes = []

    if velocity_5min >= 5:
        behav_score += 9.0
        behav_notes.append(f"Rapid burst: {velocity_5min} txns in 5 minutes")
    elif velocity_5min >= 3:
        behav_score += 6.0
        behav_notes.append(f"Elevated velocity: {velocity_5min} txns in 5 minutes")
    elif velocity_5min >= 1:
        behav_score += 3.0

    if velocity_1hr >= 10:
        behav_score += 6.0
        behav_notes.append(f"High activity: {velocity_1hr} txns in past hour")
    elif velocity_1hr >= 5:
        behav_score += 4.0
        behav_notes.append(f"Elevated activity: {velocity_1hr} txns in past hour")
    elif velocity_1hr >= 2:
        behav_score += 2.0

    drain_ratio = (amount / sender_balance) if sender_balance > 0 else 1.0
    if drain_ratio >= 0.85:
        behav_score += 5.0
        behav_notes.append(f"Account drain pattern: transfers {drain_ratio:.0%} of balance")
    elif drain_ratio >= 0.50:
        behav_score += 3.0
        behav_notes.append(f"Transfers {drain_ratio:.0%} of balance")

    if sender_incident_count > 0:
        behav_score += 2.0
        behav_notes.append(f"Sender has {sender_incident_count} prior flags")

    behav_score = min(20.0, round(behav_score, 1))
    components.append({
        "name": "Sender Behavior",
        "key": "sender_behavior",
        "score": behav_score,
        "max_score": 20.0,
        "summary": "; ".join(behav_notes) if behav_notes else "Sender operating within standard velocity and balance thresholds.",
        "evidence": {
            "velocity_5min": velocity_5min,
            "velocity_1hr": velocity_1hr,
            "sender_balance": round(sender_balance, 2),
            "balance_drain_percentage": round(drain_ratio * 100, 1),
            "sender_prior_incidents": sender_incident_count,
        },
        "significance": "Detects anomalous account activity surges and rapid liquidations indicative of social engineering coercion or ATO.",
    })

    # ─────────────────────────────────────────────────────────────
    # 4. NETWORK & MULE RISK (0 - 15 pts)
    # ─────────────────────────────────────────────────────────────
    net_score = 0.0
    net_notes = []

    if receiver_unique_senders >= 30:
        net_score += 6.0
        net_notes.append(f"High fan-in: received funds from {receiver_unique_senders} unique senders")
    elif receiver_unique_senders >= 15:
        net_score += 4.0
        net_notes.append(f"Received funds from {receiver_unique_senders} unique senders")
    elif receiver_unique_senders >= 5:
        net_score += 2.0

    if connected_high_risk >= 3:
        net_score += 5.0
        net_notes.append(f"Connected to {connected_high_risk} high-risk accounts")
    elif connected_high_risk >= 1:
        net_score += 3.0
        net_notes.append(f"Connected to {connected_high_risk} high-risk account")

    if pass_through_rate >= 0.70:
        net_score += 4.0
        net_notes.append(f"High pass-through rate ({pass_through_rate:.0%})")
    elif pass_through_rate >= 0.40 or receiver_mule_score >= 80:
        net_score += 2.0
        net_notes.append("Elevated network flow velocity")

    net_score = min(15.0, round(net_score, 1))
    components.append({
        "name": "Network & Mule Risk",
        "key": "network_mule_risk",
        "score": net_score,
        "max_score": 15.0,
        "summary": "; ".join(net_notes) if net_notes else "No suspicious mule clustering or high-risk graph connections detected.",
        "evidence": {
            "unique_senders": receiver_unique_senders,
            "connected_high_risk_accounts": connected_high_risk,
            "pass_through_rate": round(pass_through_rate * 100, 1),
            "mule_risk_score": receiver_mule_score,
        },
        "significance": "Evaluates graph topology for rapid fund passthrough, high fan-in aggregation, and adjacency to flagged entities.",
    })

    # ─────────────────────────────────────────────────────────────
    # 5. ML MODEL SIGNAL (0 - 15 pts)
    # ─────────────────────────────────────────────────────────────
    # Deterministic mapping of XGBoost probability vs configured model threshold
    ml_score = 0.0
    thresh = float(settings.MODEL_FRAUD_THRESHOLD)
    if fraud_probability >= thresh:
        ml_score = 15.0
        ml_note = f"XGBoost probability ({fraud_probability:.1%}) exceeds classification threshold ({thresh:.1%})"
    elif fraud_probability >= 0.90:
        ml_score = 12.0
        ml_note = f"XGBoost probability ({fraud_probability:.1%}) indicates strong risk"
    elif fraud_probability >= 0.70:
        ml_score = 8.0
        ml_note = f"XGBoost probability ({fraud_probability:.1%}) indicates moderate risk"
    elif fraud_probability >= 0.30:
        ml_score = 4.0
        ml_note = f"XGBoost probability ({fraud_probability:.1%}) indicates low-to-medium risk"
    else:
        ml_score = round(min(3.0, fraud_probability * 10.0), 1)
        ml_note = f"XGBoost probability ({fraud_probability:.2%}) is low and contributes minimal risk"

    ml_score = min(15.0, round(ml_score, 1))
    components.append({
        "name": "ML Model Signal",
        "key": "ml_model_signal",
        "score": ml_score,
        "max_score": 15.0,
        "summary": ml_note,
        "evidence": {
            "fraud_probability": round(fraud_probability, 6),
            "model_threshold": thresh,
            "is_above_threshold": fraud_probability >= thresh,
            "model_type": "PaySim XGBoost Booster",
        },
        "significance": "Statistical likelihood derived from 12 tabular transaction and balance features.",
    })

    # ─────────────────────────────────────────────────────────────
    # TOTAL & EXPLANATION SYNTHESIS
    # ─────────────────────────────────────────────────────────────
    total_score = int(round(sum(c["score"] for c in components)))
    total_score = min(100, max(0, total_score))
    risk_level = probability_to_risk_level(fraud_probability, composite_score=total_score)

    # Calculate contribution levels
    investigation_pts = total_score - ml_score
    intel_level = "CRITICAL" if investigation_pts >= 65 else "HIGH" if investigation_pts >= 45 else "MEDIUM" if investigation_pts >= 20 else "LOW"
    ml_level = "CRITICAL" if ml_score >= 14 else "HIGH" if ml_score >= 10 else "MEDIUM" if ml_score >= 4 else "LOW"

    # Identify primary drivers
    sorted_comps = sorted(components, key=lambda c: (c["score"] / c["max_score"]), reverse=True)
    top_drivers = [c for c in sorted_comps if c["score"] > 0][:3]
    driver_summaries = [c["summary"] for c in top_drivers if c["summary"]]

    headline = f"WHY {risk_level}? (Investigation Risk: {total_score}/100)"
    if total_score >= 60:
        summary_text = (
            f"This transaction exhibits elevated investigation risk primarily driven by "
            f"{top_drivers[0]['name'].lower()} ({int(top_drivers[0]['score'])}/{int(top_drivers[0]['max_score'])} pts)"
            + (f" and {top_drivers[1]['name'].lower()} ({int(top_drivers[1]['score'])}/{int(top_drivers[1]['max_score'])} pts)." if len(top_drivers) > 1 else ".")
            + f" {driver_summaries[0]}"
        )
    else:
        summary_text = (
            f"Transaction presents low overall investigation risk ({total_score}/100). "
            f"Key metrics remain within expected parameters across baseline behaviors."
        )

    explanation = {
        "headline": headline,
        "summary": summary_text,
        "ml_signal_level": ml_level,
        "investigation_intel_level": intel_level,
    }

    # Generate legacy flat risk_factors list for backwards compatibility
    factors = []
    for c in components:
        if c["score"] > 0 and c["summary"] and not c["summary"].startswith("No "):
            factors.append(c["summary"])

    return {
        "investigation_risk": total_score,
        "risk_level": risk_level,
        "risk_breakdown": components,
        "investigator_explanation": explanation,
        "risk_factors": factors,
    }


def calculate_composite_risk(
    fraud_probability: float,
    amount: float,
    historical_avg: float,
    is_new_recipient: bool,
    receiver_risk_score: int,
    receiver_incident_count: int,
    receiver_mule_score: int,
    velocity_5min: int,
) -> int:
    """Backwards compatibility shim for legacy callers."""
    breakdown = calculate_explainable_risk_breakdown(
        fraud_probability=fraud_probability,
        amount=amount,
        tx_type="TRANSFER",
        sender_account_id="",
        receiver_account_id="",
        sender_balance=100000.0,
        receiver_balance=50000.0,
        historical_avg=historical_avg,
        historical_std=1000.0,
        is_new_recipient=is_new_recipient,
        sender_incident_count=0,
        receiver_incident_count=receiver_incident_count,
        receiver_age_days=14 if receiver_risk_score >= 80 else 180,
        receiver_kyc_status="PENDING" if receiver_risk_score >= 80 else "VERIFIED",
        receiver_mule_score=receiver_mule_score,
        receiver_unique_senders=50 if receiver_mule_score >= 80 else 5,
        connected_high_risk=3 if receiver_mule_score >= 80 else 0,
        pass_through_rate=0.85 if receiver_mule_score >= 80 else 0.1,
        velocity_5min=velocity_5min,
        velocity_1hr=velocity_5min * 2,
    )
    return breakdown["investigation_risk"]


def calculate_risk_factors(
    fraud_probability: float,
    amount: float,
    tx_type: str,
    historical_avg: float,
    historical_std: float,
    is_new_recipient: bool,
    sender_incident_count: int,
    receiver_incident_count: int,
    velocity_5min: int,
    velocity_1hr: int,
    receiver_risk_score: int,
    receiver_unique_senders: int,
    account_age_days: int,
) -> List[str]:
    """Backwards compatibility shim for legacy callers."""
    breakdown = calculate_explainable_risk_breakdown(
        fraud_probability=fraud_probability,
        amount=amount,
        tx_type=tx_type,
        sender_account_id="",
        receiver_account_id="",
        sender_balance=100000.0,
        receiver_balance=50000.0,
        historical_avg=historical_avg,
        historical_std=historical_std,
        is_new_recipient=is_new_recipient,
        sender_incident_count=sender_incident_count,
        receiver_incident_count=receiver_incident_count,
        receiver_age_days=account_age_days,
        receiver_kyc_status="PENDING" if receiver_risk_score >= 80 else "VERIFIED",
        receiver_mule_score=receiver_risk_score,
        receiver_unique_senders=receiver_unique_senders,
        connected_high_risk=3 if receiver_risk_score >= 80 else 0,
        pass_through_rate=0.85 if receiver_risk_score >= 80 else 0.1,
        velocity_5min=velocity_5min,
        velocity_1hr=velocity_1hr,
    )
    return breakdown["risk_factors"]


def get_risk_summary(risk_level: str) -> str:
    """Return a plain-language risk summary avoiding absolute criminal claims."""
    summaries = {
        "CRITICAL": "High-risk transaction requiring immediate investigation",
        "HIGH": "Potential fraudulent activity — investigation recommended",
        "MEDIUM": "Suspicious transaction — further review advised",
        "LOW": "Low risk — no immediate action required",
    }
    return summaries.get(risk_level, "Unknown risk level")
