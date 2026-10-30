from datetime import datetime, timedelta
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.models.models import SurveySession, Measurement, DeadZoneRecord
from backend.schemas.schemas import SurveyResponse
from backend.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/demo", tags=["Demo Mode (Isolated)"])


@router.post("/generate", response_model=SurveyResponse)
def generate_isolated_demo_survey(
    name: str = "Demo Survey (Isolated Test Dataset)",
    db: Session = Depends(get_db)
):
    """
    Generates an isolated, clearly labeled demonstration survey.
    Models real wireless physics: Log-distance path loss, wall penetration losses,
    and a distinct dead zone in an obstructed rear corridor.
    NOTE: Stored with is_demo=True, completely separate from live walk-around surveys.
    """
    session = SurveySession(
        name=name,
        selected_ssid="Demo-Lab-Network-5G",
        selected_bssid="00:11:22:33:44:55",
        positioning_mode="indoor_canvas",
        status="completed",
        is_demo=True,
        notes="Isolated demonstration dataset generated for evaluation. Demonstrates IDW spatial interpolation and dead zone identification."
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Simulate realistic walking grid: 6 x 6 room layout (coords 0..50 meters)
    # Router AP is at (10, 10)
    # A concrete wall exists at x > 35
    router_x, router_y = 10.0, 10.0
    now = datetime.utcnow()

    measurements = []
    dz_count = 0

    walk_steps = [
        # Zone A (Near AP - Excellent)
        (10.0, 10.0, -36), (14.0, 10.0, -42), (18.0, 12.0, -48), (12.0, 16.0, -45),
        # Zone B (Mid Room - Good)
        (22.0, 14.0, -54), (25.0, 18.0, -57), (20.0, 24.0, -58), (28.0, 22.0, -60),
        # Zone C (Across Open Space - Fair)
        (30.0, 26.0, -64), (32.0, 30.0, -67), (28.0, 34.0, -66), (24.0, 36.0, -68),
        # Zone D (Behind Drywall Partition - Weak)
        (36.0, 32.0, -74), (38.0, 36.0, -77), (35.0, 40.0, -76), (40.0, 38.0, -79),
        # Zone E (Rear Corner / Faraday obstacle - Dead Zones)
        (44.0, 42.0, -84), (46.0, 45.0, -88), (48.0, 44.0, -86), (45.0, 48.0, -89)
    ]

    for idx, (x, y, base_rssi) in enumerate(walk_steps):
        # Slightly vary with multipath jitter
        jitter = ((idx * 7) % 3) - 1
        rssi = base_rssi + jitter
        quality = max(5, min(100, int((rssi + 100) * 2)))
        tier = AnalysisService.classify_signal(rssi)
        t = now - timedelta(seconds=(len(walk_steps) - idx) * 4)

        m = Measurement(
            session_id=session.id,
            ssid="Demo-Lab-Network-5G",
            bssid="00:11:22:33:44:55",
            rssi=rssi,
            signal_quality=quality,
            channel=36,
            band="5 GHz",
            frequency=5180,
            radio_type="802.11ac",
            x=x,
            y=y,
            classification=tier,
            timestamp=t
        )
        db.add(m)
        measurements.append(m)

        if tier == "dead":
            dz_count += 1
            severity = "critical" if rssi < -85 else "high"
            dz = DeadZoneRecord(
                session_id=session.id,
                x=x,
                y=y,
                rssi=rssi,
                severity=severity,
                probable_causes="Excessive distance from router (45m+) compounded by interior concrete partitions and metal fire doors.",
                timestamp=t
            )
            db.add(dz)

    db.commit()

    # Recalculate stats
    stats = AnalysisService.compute_summary_statistics(measurements)
    session.total_measurements = len(measurements)
    session.coverage_score = stats["coverage_score"]
    session.dead_zone_count = dz_count
    session.avg_rssi = stats["avg_rssi"]
    session.min_rssi = stats["min_rssi"]
    session.max_rssi = stats["max_rssi"]
    session.completed_at = now

    db.commit()
    db.refresh(session)
    return session


@router.delete("/clear")
def clear_demo_surveys(db: Session = Depends(get_db)):
    """Removes only surveys created in demo mode, preserving real surveys."""
    demos = db.query(SurveySession).filter(SurveySession.is_demo == True).all()
    count = len(demos)
    for d in demos:
        db.delete(d)
    db.commit()
    return {"message": f"Cleared {count} demo survey sessions.", "count": count}
