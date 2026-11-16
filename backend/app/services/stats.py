from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import Assignment, Match, Team

def get_referee_stats(db: Session, referee_id: str) -> Dict[str, Any]:
    assignments = (
        db.query(Assignment)
        .filter(Assignment.referee_id == referee_id)
        .all()
    )

    total_assigned = len(assignments)
    confirmed = sum(1 for a in assignments if a.status == "confirmed")
    refused = sum(1 for a in assignments if a.status == "refused")
    
    total_decided = confirmed + refused
    acceptance_rate = round((confirmed / total_decided) * 100) if total_decided > 0 else 0

    # Build past matches (assignments that have match details)
    past_matches_list: List[Dict[str, Any]] = []
    for a in assignments:
        m = a.match
        if m:
            home_name = m.home_team.name if m.home_team else "Home"
            away_name = m.away_team.name if m.away_team else "Away"
            past_matches_list.append({
                "id": m.id,
                "home_team": home_name,
                "away_team": away_name,
                "date": m.date,
                "division": m.division,
                "status": a.status,
                "indemnity": float(a.indemnity),
            })

    # Sort past matches by date descending
    past_matches_list.sort(key=lambda x: str(x.get("date", "")), reverse=True)

    return {
        "total_assigned": total_assigned,
        "confirmed": confirmed,
        "refused": refused,
        "acceptance_rate": acceptance_rate,
        "past_matches": past_matches_list,
    }

def get_referees_stats_map(db: Session, referee_ids: List[str]) -> Dict[str, Dict[str, int]]:
    assignments = (
        db.query(Assignment)
        .filter(Assignment.referee_id.in_(referee_ids))
        .all()
    )

    stats_map: Dict[str, Dict[str, int]] = {
        rid: {"total": 0, "confirmed": 0, "refused": 0, "rate": 0}
        for rid in referee_ids
    }

    for a in assignments:
        if a.referee_id in stats_map:
            stats_map[a.referee_id]["total"] += 1
            if a.status == "confirmed":
                stats_map[a.referee_id]["confirmed"] += 1
            elif a.status == "refused":
                stats_map[a.referee_id]["refused"] += 1

    for rid, st in stats_map.items():
        decided = st["confirmed"] + st["refused"]
        st["rate"] = round((st["confirmed"] / decided) * 100) if decided > 0 else 0

    return stats_map
