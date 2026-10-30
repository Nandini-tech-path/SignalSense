from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.models.models import AppSettings
from backend.schemas.schemas import SettingsModel

router = APIRouter(prefix="/api/settings", tags=["Settings"])


def _ensure_settings(db: Session) -> AppSettings:
    settings = db.query(AppSettings).first()
    if not settings:
        settings = AppSettings(
            id=1,
            excellent_threshold=-50,
            good_threshold=-60,
            fair_threshold=-70,
            weak_threshold=-80,
            dead_threshold=-80,
            scan_interval_seconds=2,
            positioning_mode_default="auto"
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=SettingsModel)
def get_settings(db: Session = Depends(get_db)):
    """Retrieves system signal threshold and survey configuration."""
    settings = _ensure_settings(db)
    return settings


@router.put("", response_model=SettingsModel)
def update_settings(payload: SettingsModel, db: Session = Depends(get_db)):
    """Updates user-defined signal classification thresholds."""
    settings = _ensure_settings(db)
    settings.excellent_threshold = payload.excellent_threshold
    settings.good_threshold = payload.good_threshold
    settings.fair_threshold = payload.fair_threshold
    settings.weak_threshold = payload.weak_threshold
    settings.dead_threshold = payload.dead_threshold
    settings.scan_interval_seconds = payload.scan_interval_seconds
    settings.positioning_mode_default = payload.positioning_mode_default
    db.commit()
    db.refresh(settings)
    return settings
