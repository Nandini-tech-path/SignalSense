from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.models.models import SurveySession, Measurement, DeadZoneRecord, AppSettings
from backend.schemas.schemas import MeasurementCreateRequest, MeasurementResponse
from backend.scanner.wifi_scanner import scanner_instance
from backend.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/measurements", tags=["Measurements"])


@router.post("", response_model=MeasurementResponse)
def add_measurement(payload: MeasurementCreateRequest, db: Session = Depends(get_db)):
    """
    Records a real Wi-Fi measurement at the user's current physical or canvas position.
    Pulls live RSSI and RF data directly from the system's Wi-Fi adapter.
    """
    session = db.query(SurveySession).filter(SurveySession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Survey session not found")

    settings = db.query(AppSettings).first()

    # Determine signal values: use payload if explicitly supplied, else pull real live reading from adapter
    rssi = payload.rssi
    signal_quality = payload.signal_quality
    channel = payload.channel
    band = payload.band
    frequency = payload.frequency
    radio_type = payload.radio_type

    if rssi is None or signal_quality is None:
        live = scanner_instance.get_live_reading_for_network(session.selected_ssid, session.selected_bssid)
        if live:
            rssi = live.get("rssi", -65)
            signal_quality = live.get("signal_quality", 60)
            channel = live.get("channel")
            band = live.get("band")
            frequency = live.get("frequency")
            radio_type = live.get("radio_type")
        else:
            # Fall back to inspecting connected adapter
            adapter = scanner_instance.get_adapter_status()
            conn = adapter.get("connected_network")
            if conn and conn.get("ssid") == session.selected_ssid:
                rssi = conn.get("rssi", -60)
                signal_quality = conn.get("signal_percent", 70)
                channel = conn.get("channel")
                band = conn.get("band")
                radio_type = conn.get("radio_type")
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Target network '{session.selected_ssid}' is out of range or adapter is offline."
                )

    classification = AnalysisService.classify_signal(rssi, settings)

    meas = Measurement(
        session_id=session.id,
        ssid=session.selected_ssid,
        bssid=session.selected_bssid,
        rssi=rssi,
        signal_quality=signal_quality or 50,
        channel=channel,
        band=band,
        frequency=frequency,
        radio_type=radio_type,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy_meters=payload.accuracy_meters,
        x=payload.x,
        y=payload.y,
        classification=classification,
        timestamp=datetime.utcnow()
    )
    db.add(meas)

    # If this is a dead zone, automatically register a DeadZoneRecord
    if classification == "dead":
        severity = "critical" if rssi < -85 else "high"
        causes = "Distance attenuation, dense physical obstructions, or localized multipath interference"
        dz = DeadZoneRecord(
            session_id=session.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            x=payload.x,
            y=payload.y,
            rssi=rssi,
            severity=severity,
            probable_causes=causes,
            timestamp=datetime.utcnow()
        )
        db.add(dz)
        session.dead_zone_count = (session.dead_zone_count or 0) + 1

    session.total_measurements = (session.total_measurements or 0) + 1
    db.commit()
    db.refresh(meas)
    return meas


@router.get("/{session_id}", response_model=List[MeasurementResponse])
def get_measurements_for_session(session_id: str, db: Session = Depends(get_db)):
    """Retrieves all measurement records for a specific survey session."""
    measurements = (
        db.query(Measurement)
        .filter(Measurement.session_id == session_id)
        .order_by(Measurement.id.asc())
        .all()
    )
    return measurements
