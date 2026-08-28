"""
Fast, Explainable Fund Flow & Network Analysis Service.
Tracks where money came from (sources) and where it went (destinations) in the last N days (24h, 7d, 30d).
Outputs both clean tabular flow data and lightweight, responsive graph nodes for ReactFlow.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.transaction import Transaction
from app.models.account import Account
from app.models.incident import Incident
from app.models.customer import Customer


def _score_to_risk_level(score: int) -> str:
    if score >= 85:
        return "CRITICAL"
    elif score >= 60:
        return "HIGH"
    elif score >= 30:
        return "MEDIUM"
    else:
        return "LOW"


def build_account_network(db: Session, account_id: str, depth: int = 2, days: Optional[int] = 7) -> Dict:
    """
    Builds a clean, non-laggy fund flow view:
    Shows exactly which accounts sent money to `account_id` and where money went in the requested timeframe (1, 7, 30 days).
    """
    days = days or 7
    now = datetime.utcnow()
    center_acc = db.query(Account).filter(Account.account_id == account_id).first()
    if not center_acc:
        return {
            "nodes": [],
            "edges": [],
            "sources": [],
            "destinations": [],
            "timeline": [],
            "summary": {
                "center_account": account_id,
                "timeframe_days": days,
                "timeframe_label": "Last 24 Hours" if days == 1 else "Past 7 Days" if days == 7 else "Past 30 Days",
                "total_incoming_volume": 0,
                "total_outgoing_volume": 0,
                "net_retention": 0,
                "pass_through_rate": 0,
                "unique_senders_count": 0,
                "unique_receivers_count": 0,
                "total_transactions_count": 0,
                "high_risk_connections": 0,
            }
        }

    center_cust = db.query(Customer).filter(Customer.customer_id == center_acc.customer_id).first() if center_acc.customer_id else None

    # Timeframe filter: compute cutoff based on latest transaction timestamp to support datasets gracefully
    latest_txn = db.query(func.max(Transaction.timestamp)).filter(
        or_(Transaction.sender_account_id == account_id, Transaction.receiver_account_id == account_id)
    ).scalar()
    
    if latest_txn:
        cutoff_time = latest_txn - timedelta(days=days)
    else:
        cutoff_time = now - timedelta(days=days)

    # Fetch Direct Incoming (Where Money Came From)
    incoming_txns = (
        db.query(Transaction)
        .filter(Transaction.receiver_account_id == account_id, Transaction.timestamp >= cutoff_time)
        .order_by(Transaction.timestamp.desc())
        .limit(100)
        .all()
    )

    # Fetch Direct Outgoing (Where Money Went)
    outgoing_txns = (
        db.query(Transaction)
        .filter(Transaction.sender_account_id == account_id, Transaction.timestamp >= cutoff_time)
        .order_by(Transaction.timestamp.desc())
        .limit(100)
        .all()
    )

    # Fallback only if no transactions in strict cutoff and total account transactions exist
    if not incoming_txns and not outgoing_txns:
        incoming_txns = db.query(Transaction).filter(
            Transaction.receiver_account_id == account_id
        ).order_by(Transaction.timestamp.desc()).limit(15).all()
        outgoing_txns = db.query(Transaction).filter(
            Transaction.sender_account_id == account_id
        ).order_by(Transaction.timestamp.desc()).limit(15).all()

    all_txns = incoming_txns + outgoing_txns

    # Collect connected account IDs
    sender_ids = list(set(t.sender_account_id for t in incoming_txns if t.sender_account_id != account_id))
    receiver_ids = list(set(t.receiver_account_id for t in outgoing_txns if t.receiver_account_id != account_id))
    all_account_ids = list(set([account_id] + sender_ids + receiver_ids))

    # Batch query accounts and customers
    accounts = db.query(Account).filter(Account.account_id.in_(all_account_ids)).all() if all_account_ids else []
    account_map = {a.account_id: a for a in accounts}

    customer_ids = [a.customer_id for a in accounts if a.customer_id]
    customers = db.query(Customer).filter(Customer.customer_id.in_(customer_ids)).all() if customer_ids else []
    customer_map = {c.customer_id: c for c in customers}

    # Batch query incident counts
    incidents_grouped = db.query(
        Incident.account_id, func.count(Incident.incident_id)
    ).filter(Incident.account_id.in_(all_account_ids)).group_by(Incident.account_id).all() if all_account_ids else []
    incident_map = {acc_id: count for acc_id, count in incidents_grouped}

    # Aggregate Sources (Where money came from)
    sources_dict = {}
    for t in incoming_txns:
        s_id = t.sender_account_id
        if s_id not in sources_dict:
            acc = account_map.get(s_id)
            cust = customer_map.get(acc.customer_id) if acc else None
            sources_dict[s_id] = {
                "account_id": s_id,
                "masked_id": "XXXX" + s_id[-4:] if len(s_id) > 4 else s_id,
                "name": cust.name if cust else f"Originator {s_id}",
                "customer_name": cust.name if cust else f"Account {s_id}",
                "account_type": acc.account_type if acc else "SAVINGS",
                "total_amount": 0.0,
                "tx_count": 0,
                "risk_score": acc.risk_score if acc else 0,
                "risk_level": _score_to_risk_level(acc.risk_score if acc else 0),
                "last_timestamp": t.timestamp.isoformat() if t.timestamp else "",
                "transaction_type": t.transaction_type,
            }
        sources_dict[s_id]["total_amount"] += t.amount
        sources_dict[s_id]["tx_count"] += 1

    sources_list = sorted(sources_dict.values(), key=lambda x: x["total_amount"], reverse=True)

    # Aggregate Destinations (Where money went)
    dest_dict = {}
    for t in outgoing_txns:
        r_id = t.receiver_account_id
        if r_id not in dest_dict:
            acc = account_map.get(r_id)
            cust = customer_map.get(acc.customer_id) if acc else None
            dest_dict[r_id] = {
                "account_id": r_id,
                "masked_id": "XXXX" + r_id[-4:] if len(r_id) > 4 else r_id,
                "name": cust.name if cust else f"Beneficiary {r_id}",
                "customer_name": cust.name if cust else f"Account {r_id}",
                "account_type": acc.account_type if acc else "CURRENT",
                "total_amount": 0.0,
                "tx_count": 0,
                "risk_score": acc.risk_score if acc else 0,
                "risk_level": _score_to_risk_level(acc.risk_score if acc else 0),
                "last_timestamp": t.timestamp.isoformat() if t.timestamp else "",
                "transaction_type": t.transaction_type,
            }
        dest_dict[r_id]["total_amount"] += t.amount
        dest_dict[r_id]["tx_count"] += 1

    dest_list = sorted(dest_dict.values(), key=lambda x: x["total_amount"], reverse=True)

    # Chronological Timeline of Fund Movements
    timeline = []
    for t in all_txns:
        is_incoming = t.receiver_account_id == account_id
        counterparty_id = t.sender_account_id if is_incoming else t.receiver_account_id
        c_acc = account_map.get(counterparty_id)
        c_cust = customer_map.get(c_acc.customer_id) if c_acc else None
        timeline.append({
            "transaction_id": t.transaction_id,
            "direction": "IN" if is_incoming else "OUT",
            "counterparty_account": counterparty_id,
            "counterparty_name": c_cust.name if c_cust else counterparty_id,
            "masked_counterparty": "XXXX" + counterparty_id[-4:] if len(counterparty_id) > 4 else counterparty_id,
            "amount": t.amount,
            "timestamp": t.timestamp.isoformat() if t.timestamp else "",
            "risk_level": t.risk_level or "LOW",
            "type": t.transaction_type,
            "status": t.status,
        })
    timeline = sorted(timeline, key=lambda x: x["timestamp"], reverse=True)

    # ─────────────────────────────────────────────────────────────
    # BUILD CLEAN, NON-LAGGY LEFT-TO-RIGHT REACTFLOW GRAPH
    # ─────────────────────────────────────────────────────────────
    top_sources = sources_list[:5]
    top_dests = dest_list[:5]

    nodes = []
    edges = []

    # Calculate summary metrics first
    total_in = sum(t.amount for t in incoming_txns)
    total_out = sum(t.amount for t in outgoing_txns)
    pass_through = (total_out / total_in * 100) if total_in > 0 else 0.0

    # 1. Center Target Node (x: 480, y: 220)
    nodes.append({
        "id": account_id,
        "type": "centerNode",
        "position": {"x": 480, "y": 220},
        "data": {
            "account_id": account_id,
            "masked_id": "XXXX" + account_id[-4:] if len(account_id) > 4 else account_id,
            "label": account_id,
            "name": center_cust.name if center_cust else "Target Account",
            "role": "CENTER",
            "risk_score": center_acc.risk_score,
            "risk_level": _score_to_risk_level(center_acc.risk_score),
            "balance": center_acc.balance,
            "is_center": True,
            "incident_count": incident_map.get(account_id, 0),
            "total_incoming": total_in,
            "total_outgoing": total_out,
            "pass_through_rate": pass_through,
        },
    })

    # 2. Left Column: Incoming Senders (x: 60)
    source_spacing = 110
    start_y_src = max(40, 220 - ((len(top_sources) - 1) * source_spacing) // 2)
    for idx, src in enumerate(top_sources):
        src_y = start_y_src + idx * source_spacing
        nodes.append({
            "id": src["account_id"],
            "type": "sourceNode",
            "position": {"x": 60, "y": src_y},
            "data": {
                "account_id": src["account_id"],
                "masked_id": src["masked_id"],
                "name": src["name"],
                "label": src["name"],
                "role": "SOURCE",
                "risk_score": src["risk_score"],
                "risk_level": src["risk_level"],
                "volume": src["total_amount"],
                "tx_count": src["tx_count"],
                "is_center": False,
            },
        })
        # Edge from Source (Right Handle) -> Center (Left Handle)
        edges.append({
            "id": f"e_{src['account_id']}_{account_id}",
            "source": src["account_id"],
            "target": account_id,
            "sourceHandle": "right",
            "targetHandle": "left",
            "animated": src["risk_level"] in ("HIGH", "CRITICAL"),
            "style": {
                "stroke": "#ef4444" if src["risk_level"] == "CRITICAL" else "#f97316" if src["risk_level"] == "HIGH" else "#3b82f6",
                "strokeWidth": 2.5,
            },
            "label": f"₹{src['total_amount']:,.0f}",
            "labelStyle": {"fill": "#93c5fd", "fontSize": 11, "fontWeight": "bold"},
            "labelBgStyle": {"fill": "#0f172a", "fillOpacity": 0.85},
            "labelBgPadding": [4, 2],
            "labelBgBorderRadius": 4,
        })

    # 3. Right Column: Outgoing Destinations (x: 900)
    start_y_dest = max(40, 220 - ((len(top_dests) - 1) * source_spacing) // 2)
    for idx, dest in enumerate(top_dests):
        dest_y = start_y_dest + idx * source_spacing
        nodes.append({
            "id": dest["account_id"],
            "type": "destNode",
            "position": {"x": 900, "y": dest_y},
            "data": {
                "account_id": dest["account_id"],
                "masked_id": dest["masked_id"],
                "name": dest["name"],
                "label": dest["name"],
                "role": "DESTINATION",
                "risk_score": dest["risk_score"],
                "risk_level": dest["risk_level"],
                "volume": dest["total_amount"],
                "tx_count": dest["tx_count"],
                "is_center": False,
            },
        })
        # Edge from Center (Right Handle) -> Destination (Left Handle)
        edges.append({
            "id": f"e_{account_id}_{dest['account_id']}",
            "source": account_id,
            "target": dest["account_id"],
            "sourceHandle": "right",
            "targetHandle": "left",
            "animated": dest["risk_level"] in ("HIGH", "CRITICAL"),
            "style": {
                "stroke": "#ef4444" if dest["risk_level"] == "CRITICAL" else "#f97316" if dest["risk_level"] == "HIGH" else "#10b981",
                "strokeWidth": 2.5,
            },
            "label": f"₹{dest['total_amount']:,.0f}",
            "labelStyle": {"fill": "#86efac", "fontSize": 11, "fontWeight": "bold"},
            "labelBgStyle": {"fill": "#0f172a", "fillOpacity": 0.85},
            "labelBgPadding": [4, 2],
            "labelBgBorderRadius": 4,
        })

    timeframe_labels = {
        1: "Past 24 Hours",
        7: "Past 7 Days (1 Week)",
        30: "Past 30 Days (1 Month)",
    }

    summary = {
        "center_account": account_id,
        "center_name": center_cust.name if center_cust else "Target Account",
        "center_masked": "XXXX" + account_id[-4:] if len(account_id) > 4 else account_id,
        "timeframe_days": days,
        "timeframe_label": timeframe_labels.get(days, f"Past {days} Days"),
        "total_incoming_volume": round(total_in, 2),
        "total_outgoing_volume": round(total_out, 2),
        "net_retention": round(total_in - total_out, 2),
        "pass_through_rate": round(pass_through, 1),
        "unique_senders_count": len(sources_list),
        "unique_receivers_count": len(dest_list),
        "total_transactions_count": len(all_txns),
        "high_risk_connections": sum(1 for a in [s["risk_score"] for s in sources_list] + [d["risk_score"] for d in dest_list] if a >= 60),
    }

    return {
        "nodes": nodes,
        "edges": edges,
        "sources": sources_list,
        "destinations": dest_list,
        "timeline": timeline,
        "summary": summary,
    }

