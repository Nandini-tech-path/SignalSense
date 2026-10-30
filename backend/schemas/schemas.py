from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class WiFiNetwork(BaseModel):
    ssid: str
    bssid: str
    rssi: int
    signal_quality: int
    channel: Optional[int] = None
    band: Optional[str] = None
    frequency: Optional[int] = None
    radio_type: Optional[str] = None
    authentication: Optional[str] = None
    encryption: Optional[str] = None
    is_connected: bool = False
    timestamp: str


class AdapterStatusResponse(BaseModel):
    available: bool
    state: str
    interface_name: Optional[str] = None
    description: Optional[str] = None
    connected: bool = False
    connected_network: Optional[Dict[str, Any]] = None
    location_service_available: bool = True
    storage_ready: bool = True
    scanner_ready: bool = True
    message: str


class SurveyCreateRequest(BaseModel):
    name: Optional[str] = None
    selected_ssid: str
    selected_bssid: Optional[str] = None
    positioning_mode: str = "auto"  # 'gps', 'indoor_canvas', 'relative_walk', 'auto'
    notes: Optional[str] = None


class SurveyResponse(BaseModel):
    id: str
    name: str
    selected_ssid: str
    selected_bssid: Optional[str] = None
    positioning_mode: str
    status: str
    is_demo: bool
    total_measurements: int
    coverage_score: Optional[float] = None
    dead_zone_count: int
    avg_rssi: Optional[float] = None
    min_rssi: Optional[int] = None
    max_rssi: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MeasurementCreateRequest(BaseModel):
    session_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_meters: Optional[float] = None
    x: Optional[float] = None
    y: Optional[float] = None
    # If client provides overrides, else backend reads live from adapter
    rssi: Optional[int] = None
    signal_quality: Optional[int] = None
    channel: Optional[int] = None
    band: Optional[str] = None
    frequency: Optional[int] = None
    radio_type: Optional[str] = None


class MeasurementResponse(BaseModel):
    id: int
    session_id: str
    ssid: str
    bssid: Optional[str] = None
    rssi: int
    signal_quality: int
    channel: Optional[int] = None
    band: Optional[str] = None
    frequency: Optional[int] = None
    radio_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_meters: Optional[float] = None
    x: Optional[float] = None
    y: Optional[float] = None
    classification: str
    timestamp: datetime

    class Config:
        from_attributes = True


class DeadZoneResponse(BaseModel):
    id: int
    session_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    x: Optional[float] = None
    y: Optional[float] = None
    rssi: int
    severity: str
    probable_causes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class HeatmapCell(BaseModel):
    x: float
    y: float
    rssi: float
    classification: str


class CoverageGridResponse(BaseModel):
    session_id: str
    coordinate_system: str  # 'geographic' or 'cartesian'
    min_x: float
    max_x: float
    min_y: float
    max_y: float
    grid_rows: int
    grid_cols: int
    status: str  # 'ready', 'insufficient_data'
    message: str
    cells: List[HeatmapCell]
    sample_count: int


class CoverageAnalysisResponse(BaseModel):
    session_id: str
    survey_name: str
    selected_ssid: str
    total_measurements: int
    coverage_score: float
    strongest_rssi: Optional[int] = None
    weakest_rssi: Optional[int] = None
    avg_rssi: Optional[float] = None
    classifications: Dict[str, float]  # percentage for each category
    band_distribution: Dict[str, int]
    channel_distribution: Dict[str, int]
    dead_zone_count: int
    weak_zone_count: int
    timeline: List[Dict[str, Any]]
    status: str


class RecommendationItem(BaseModel):
    category: str
    title: str
    severity: str  # 'critical', 'warning', 'info'
    description: str
    possible_causes: List[str]
    suggested_actions: List[str]


class RecommendationsResponse(BaseModel):
    session_id: str
    selected_ssid: str
    dead_zone_count: int
    weak_zone_count: int
    coverage_score: float
    recommendations: List[RecommendationItem]


class SurveyComparisonResponse(BaseModel):
    survey_a: SurveyResponse
    survey_b: SurveyResponse
    coverage_delta: float
    dead_zones_delta: int
    avg_rssi_delta: float
    improvement_summary: str
    comparison_points: List[Dict[str, Any]]


class SettingsModel(BaseModel):
    excellent_threshold: int = -50
    good_threshold: int = -60
    fair_threshold: int = -70
    weak_threshold: int = -80
    dead_threshold: int = -80
    scan_interval_seconds: int = 2
    positioning_mode_default: str = "auto"

    class Config:
        from_attributes = True
