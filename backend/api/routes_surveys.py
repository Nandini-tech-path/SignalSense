
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.models.models import SurveySession, Measurement
from backend.schemas.schemas import SurveyCreateRequest, SurveyResponse
from backend.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/surveys", tags=["Surveys"])


@router.get("", response_model=List[SurveyResponse])
def list_surveys(db: Session = Depends(get_db)):
    """Returns all recorded Wi-Fi surveys, newest first."""
    surveys = db.query(SurveySession).order_by(SurveySession.created_at.desc()).all()
    return surveys


@router.post("", response_model=SurveyResponse)
def create_survey(payload: SurveyCreateRequest, db: Session = Depends(get_db)):
    """Initializes a new Wi-Fi survey session."""
    name = payload.name
    if not name:
        now_str = datetime.now().strftime("%b %d, %H:%M")
        name = f"Survey of {payload.selected_ssid} ({now_str})"

    session = SurveySession(
        name=name,
        selected_ssid=payload.selected_ssid,
        selected_bssid=payload.selected_bssid,
        positioning_mode=payload.positioning_mode,
        notes=payload.notes,
        status="in_progress",
        is_demo=False
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{survey_id}", response_model=SurveyResponse)
def get_survey(survey_id: str, db: Session = Depends(get_db)):
    """Fetches metadata for a single survey session."""
    session = db.query(SurveySession).filter(SurveySession.id == survey_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Survey session not found")
    return session


@router.put("/{survey_id}/complete", response_model=SurveyResponse)
def complete_survey(survey_id: str, db: Session = Depends(get_db)):
    """Marks survey as completed and compiles final metrics."""
    session = db.query(SurveySession).filter(SurveySession.id == survey_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Survey session not found")

    measurements = db.query(Measurement).filter(Measurement.session_id == survey_id).all()
    stats = AnalysisService.compute_summary_statistics(measurements)

    session.status = "completed"
    session.completed_at = datetime.utcnow()
    session.total_measurements = stats["total_measurements"]
    session.coverage_score = stats["coverage_score"]
    session.dead_zone_count = stats["dead_zone_count"]
    session.avg_rssi = stats["avg_rssi"]
    session.min_rssi = stats["min_rssi"]
    session.max_rssi = stats["max_rssi"]

    db.commit()
    db.refresh(session)
    return session


@router.delete("/{survey_id}")
def delete_survey(survey_id: str, db: Session = Depends(get_db)):
    """Deletes a survey session and associated measurements."""
    session = db.query(SurveySession).filter(SurveySession.id == survey_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Survey session not found")

    db.delete(session)
    db.commit()
    return {"status": "success", "message": f"Survey {survey_id} deleted."}
