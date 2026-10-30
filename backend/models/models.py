import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from backend.database.database import Base


class SurveySession(Base):
    __tablename__ = "survey_sessions"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    selected_ssid = Column(String(128), nullable=False)
    selected_bssid = Column(String(64), nullable=True)
    positioning_mode = Column(String(32), default="auto")  # 'gps', 'indoor_canvas', 'relative_walk', 'auto'
    status = Column(String(32), default="in_progress")     # 'in_progress', 'completed'
    is_demo = Column(Boolean, default=False)
    
    total_measurements = Column(Integer, default=0)
    coverage_score = Column(Float, nullable=True)          # e.g., 88.5 (%)
    dead_zone_count = Column(Integer, default=0)
    avg_rssi = Column(Float, nullable=True)
    min_rssi = Column(Integer, nullable=True)
    max_rssi = Column(Integer, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    measurements = relationship("Measurement", back_populates="session", cascade="all, delete-orphan")
    dead_zones = relationship("DeadZoneRecord", back_populates="session", cascade="all, delete-orphan")


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("survey_sessions.id", ondelete="CASCADE"), nullable=False)
    
    ssid = Column(String(128), nullable=False)
    bssid = Column(String(64), nullable=True)
    rssi = Column(Integer, nullable=False)                 # in dBm (e.g. -45, -78, -85)
    signal_quality = Column(Integer, nullable=False)       # 0 to 100 (%)
    channel = Column(Integer, nullable=True)
    band = Column(String(32), nullable=True)              # 2.4 GHz, 5 GHz, 6 GHz
    frequency = Column(Integer, nullable=True)             # in MHz
    radio_type = Column(String(32), nullable=True)         # 802.11ac, 802.11ax, etc.
    
    # Geographic coordinates (if GPS / device location available)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    accuracy_meters = Column(Float, nullable=True)
    
    # Indoor / Relative coordinates (in meters or normalized grid 0..100)
    x = Column(Float, nullable=True)
    y = Column(Float, nullable=True)
    
    classification = Column(String(32), nullable=False)    # 'excellent', 'good', 'fair', 'weak', 'dead'
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SurveySession", back_populates="measurements")


class DeadZoneRecord(Base):
    __tablename__ = "dead_zone_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("survey_sessions.id", ondelete="CASCADE"), nullable=False)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    x = Column(Float, nullable=True)
    y = Column(Float, nullable=True)
    
    rssi = Column(Integer, nullable=False)
    severity = Column(String(32), nullable=False)          # 'critical' (< -85), 'high' (-80 to -85), 'moderate' (-75 to -80)
    probable_causes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SurveySession", back_populates="dead_zones")


class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, default=1)
    # Thresholds in dBm
    excellent_threshold = Column(Integer, default=-50)     # >= -50 dBm
    good_threshold = Column(Integer, default=-60)          # -50 to -60 dBm
    fair_threshold = Column(Integer, default=-70)          # -60 to -70 dBm
    weak_threshold = Column(Integer, default=-80)          # -70 to -80 dBm
    dead_threshold = Column(Integer, default=-80)          # < -80 dBm
    
    scan_interval_seconds = Column(Integer, default=2)
    positioning_mode_default = Column(String(32), default="auto")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
