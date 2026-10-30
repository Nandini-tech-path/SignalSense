from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models.models import SurveySession, Measurement
from backend.services.analysis_service import AnalysisService


class ComparisonService:

    @classmethod
    def compare_surveys(cls, db: Session, survey_a_id: str, survey_b_id: str) -> Optional[Dict[str, Any]]:
        survey_a = db.query(SurveySession).filter(SurveySession.id == survey_a_id).first()
        survey_b = db.query(SurveySession).filter(SurveySession.id == survey_b_id).first()

        if not survey_a or not survey_b:
            return None

        meas_a = db.query(Measurement).filter(Measurement.session_id == survey_a_id).order_by(Measurement.id.asc()).all()
        meas_b = db.query(Measurement).filter(Measurement.session_id == survey_b_id).order_by(Measurement.id.asc()).all()

        stats_a = AnalysisService.compute_summary_statistics(meas_a)
        stats_b = AnalysisService.compute_summary_statistics(meas_b)

        cov_a = stats_a.get("coverage_score") or 0.0
        cov_b = stats_b.get("coverage_score") or 0.0
        cov_delta = round(cov_b - cov_a, 1)

        dead_a = stats_a.get("dead_zone_count") or 0
        dead_b = stats_b.get("dead_zone_count") or 0
        dead_delta = dead_b - dead_a

        avg_a = stats_a.get("avg_rssi") or -70.0
        avg_b = stats_b.get("avg_rssi") or -70.0
        avg_delta = round(avg_b - avg_a, 1)

        # Improvement summary statement
        if cov_delta > 0 and dead_delta <= 0:
            summary = f"Survey B achieved +{cov_delta}% higher coverage and eliminated {abs(dead_delta)} dead zone(s)."
        elif cov_delta < 0:
            summary = f"Survey B experienced a {abs(cov_delta)}% drop in coverage."
        else:
            summary = f"Coverage remained consistent across both survey passes (delta: {cov_delta}%)."

        # Timeline comparison points
        comparison_points = [
            {
                "metric": "Overall Usable Coverage",
                "survey_a_val": f"{cov_a}%",
                "survey_b_val": f"{cov_b}%",
                "delta": f"{'+' if cov_delta > 0 else ''}{cov_delta}%",
                "improved": cov_delta > 0
            },
            {
                "metric": "Dead Zones Encountered",
                "survey_a_val": str(dead_a),
                "survey_b_val": str(dead_b),
                "delta": f"{'+' if dead_delta > 0 else ''}{dead_delta}",
                "improved": dead_delta < 0
            },
            {
                "metric": "Average RSSI",
                "survey_a_val": f"{avg_a} dBm",
                "survey_b_val": f"{avg_b} dBm",
                "delta": f"{'+' if avg_delta > 0 else ''}{avg_delta} dBm",
                "improved": avg_delta > 0
            },
            {
                "metric": "Total Measurement Points",
                "survey_a_val": str(len(meas_a)),
                "survey_b_val": str(len(meas_b)),
                "delta": f"{len(meas_b) - len(meas_a)} points",
                "improved": True
            }
        ]

        return {
            "survey_a": survey_a,
            "survey_b": survey_b,
            "coverage_delta": cov_delta,
            "dead_zones_delta": dead_delta,
            "avg_rssi_delta": avg_delta,
            "improvement_summary": summary,
            "comparison_points": comparison_points
        }
