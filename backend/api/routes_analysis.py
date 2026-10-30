from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from backend.database.database import get_db
from backend.models.models import SurveySession, Measurement, DeadZoneRecord
from backend.schemas.schemas import (
    CoverageGridResponse,
    CoverageAnalysisResponse,
    DeadZoneResponse,
    RecommendationsResponse,
    SurveyComparisonResponse
)
from backend.services.analysis_service import AnalysisService
from backend.services.comparison_service import ComparisonService

router = APIRouter(prefix="/api", tags=["Analysis & Coverage"])


@router.get("/coverage/{session_id}", response_model=CoverageGridResponse)
def get_coverage_grid(session_id: str, db: Session = Depends(get_db)):
    """
    Computes an Inverse Distance Weighting (IDW) spatial interpolation
    surface across the bounding box of real survey measurements.
    """
    session = db.query(SurveySession).filter(SurveySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Survey session not found")

    measurements = db.query(Measurement).filter(Measurement.session_id == session_id).all()
    grid = AnalysisService.compute_idw_heatmap(measurements, grid_resolution=24, power=2.0)
    grid["session_id"] = session_id
    return grid


@router.get("/dead-zones/{session_id}", response_model=List[DeadZoneResponse])
def get_dead_zones(session_id: str, db: Session = Depends(get_db)):
    """Returns all identified dead zone points/regions for the session."""
    dead_zones = db.query(DeadZoneRecord).filter(DeadZoneRecord.session_id == session_id).all()
    return dead_zones


@router.get("/analysis/{session_id}", response_model=CoverageAnalysisResponse)
def get_session_analysis(session_id: str, db: Session = Depends(get_db)):
    """Provides complete network coverage statistics and breakdown."""
    session = db.query(SurveySession).filter(SurveySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Survey session not found")

    measurements = db.query(Measurement).filter(Measurement.session_id == session_id).all()
    stats = AnalysisService.compute_summary_statistics(measurements)

    return {
        "session_id": session.id,
        "survey_name": session.name,
        "selected_ssid": session.selected_ssid,
        "total_measurements": stats["total_measurements"],
        "coverage_score": stats["coverage_score"],
        "strongest_rssi": stats["max_rssi"],
        "weakest_rssi": stats["min_rssi"],
        "avg_rssi": stats["avg_rssi"],
        "classifications": stats["classifications"],
        "band_distribution": stats["band_distribution"],
        "channel_distribution": stats["channel_distribution"],
        "dead_zone_count": stats["dead_zone_count"],
        "weak_zone_count": stats["weak_zone_count"],
        "timeline": stats["timeline"],
        "status": session.status
    }


@router.get("/recommendations/{session_id}", response_model=RecommendationsResponse)
def get_session_recommendations(session_id: str, db: Session = Depends(get_db)):
    """Synthesizes actionable Computer Networks engineering recommendations."""
    session = db.query(SurveySession).filter(SurveySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Survey session not found")

    measurements = db.query(Measurement).filter(Measurement.session_id == session_id).all()
    stats = AnalysisService.compute_summary_statistics(measurements)
    recs = AnalysisService.generate_recommendations(stats, session.selected_ssid)

    return {
        "session_id": session.id,
        "selected_ssid": session.selected_ssid,
        "dead_zone_count": stats["dead_zone_count"],
        "weak_zone_count": stats["weak_zone_count"],
        "coverage_score": stats["coverage_score"],
        "recommendations": recs
    }


@router.get("/compare", response_model=SurveyComparisonResponse)
def compare_surveys(
    survey_a: str = Query(..., description="ID of baseline survey"),
    survey_b: str = Query(..., description="ID of comparison survey"),
    db: Session = Depends(get_db)
):
    """Compares metrics between two survey sessions to measure coverage improvements."""
    result = ComparisonService.compare_surveys(db, survey_a, survey_b)
    if not result:
        raise HTTPException(status_code=404, detail="One or both survey sessions could not be found.")
    return result


@router.get("/reports/{session_id}")
def get_survey_report(session_id: str, db: Session = Depends(get_db)):
    """Assembles a complete exportable report package."""
    session = db.query(SurveySession).filter(SurveySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Survey session not found")

    measurements = db.query(Measurement).filter(Measurement.session_id == session_id).all()
    stats = AnalysisService.compute_summary_statistics(measurements)
    recs = AnalysisService.generate_recommendations(stats, session.selected_ssid)
    dead_zones = db.query(DeadZoneRecord).filter(DeadZoneRecord.session_id == session_id).all()

    return {
        "survey": {
            "id": session.id,
            "name": session.name,
            "selected_ssid": session.selected_ssid,
            "selected_bssid": session.selected_bssid,
            "positioning_mode": session.positioning_mode,
            "status": session.status,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "notes": session.notes
        },
        "statistics": stats,
        "dead_zones": [
            {
                "id": dz.id,
                "rssi": dz.rssi,
                "severity": dz.severity,
                "x": dz.x,
                "y": dz.y,
                "latitude": dz.latitude,
                "longitude": dz.longitude,
                "probable_causes": dz.probable_causes,
                "timestamp": dz.timestamp.isoformat() if dz.timestamp else None
            }
            for dz in dead_zones
        ],
        "recommendations": recs,
        "generated_at": session.completed_at.isoformat() if session.completed_at else None
    }
