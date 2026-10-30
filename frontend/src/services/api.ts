export interface WiFiNetwork {
  ssid: string;
  bssid: string;
  rssi: number;
  signal_quality: number;
  channel?: number;
  band?: string;
  frequency?: number;
  radio_type?: string;
  authentication?: string;
  encryption?: string;
  is_connected: boolean;
  timestamp: string;
}

export interface AdapterStatus {
  available: boolean;
  state: string;
  interface_name: string | null;
  description: string | null;
  connected: boolean;
  connected_network: {
    ssid: string;
    bssid: string;
    rssi: number;
    signal_percent: number;
    band?: string;
    channel?: number;
    radio_type?: string;
    rx_rate_mbps?: number;
    tx_rate_mbps?: number;
  } | null;
  location_service_available: boolean;
  storage_ready: boolean;
  scanner_ready: boolean;
  message: string;
}

export interface SurveySession {
  id: string;
  name: string;
  selected_ssid: string;
  selected_bssid?: string;
  positioning_mode: string;
  status: string;
  is_demo: boolean;
  total_measurements: number;
  coverage_score?: number;
  dead_zone_count: number;
  avg_rssi?: number;
  min_rssi?: number;
  max_rssi?: number;
  notes?: string;
  created_at: string;
  completed_at?: string;
}

export interface Measurement {
  id: number;
  session_id: string;
  ssid: string;
  bssid?: string;
  rssi: number;
  signal_quality: number;
  channel?: number;
  band?: string;
  frequency?: number;
  radio_type?: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  x?: number;
  y?: number;
  classification: "excellent" | "good" | "fair" | "weak" | "dead";
  timestamp: string;
}

export interface DeadZone {
  id: number;
  session_id: string;
  latitude?: number;
  longitude?: number;
  x?: number;
  y?: number;
  rssi: number;
  severity: "critical" | "high" | "moderate";
  probable_causes?: string;
  timestamp: string;
}

export interface HeatmapCell {
  x: number;
  y: number;
  rssi: number;
  classification: "excellent" | "good" | "fair" | "weak" | "dead";
}

export interface CoverageGrid {
  session_id: string;
  coordinate_system: "geographic" | "cartesian" | "none";
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  grid_rows: number;
  grid_cols: number;
  status: "ready" | "insufficient_data";
  message: string;
  cells: HeatmapCell[];
  sample_count: number;
}

export interface CoverageAnalysis {
  session_id: string;
  survey_name: string;
  selected_ssid: string;
  total_measurements: number;
  coverage_score: number;
  strongest_rssi: number | null;
  weakest_rssi: number | null;
  avg_rssi: number | null;
  classifications: {
    excellent: number;
    good: number;
    fair: number;
    weak: number;
    dead: number;
  };
  band_distribution: Record<string, number>;
  channel_distribution: Record<string, number>;
  dead_zone_count: number;
  weak_zone_count: number;
  timeline: Array<{
    id: number;
    time: string;
    rssi: number;
    classification: string;
  }>;
  status: string;
}

export interface RecommendationItem {
  category: string;
  title: string;
  severity: "critical" | "warning" | "info";
  description: string;
  possible_causes: string[];
  suggested_actions: string[];
}

export interface RecommendationsResponse {
  session_id: string;
  selected_ssid: string;
  dead_zone_count: number;
  weak_zone_count: number;
  coverage_score: number;
  recommendations: RecommendationItem[];
}

export interface SurveyComparison {
  survey_a: SurveySession;
  survey_b: SurveySession;
  coverage_delta: number;
  dead_zones_delta: number;
  avg_rssi_delta: number;
  improvement_summary: string;
  comparison_points: Array<{
    metric: string;
    survey_a_val: string;
    survey_b_val: string;
    delta: string;
    improved: boolean;
  }>;
}

export interface AppSettings {
  excellent_threshold: number;
  good_threshold: number;
  fair_threshold: number;
  weak_threshold: number;
  dead_threshold: number;
  scan_interval_seconds: number;
  positioning_mode_default: string;
}

const API_BASE = "";

export const api = {
  async getWifiStatus(): Promise<AdapterStatus> {
    const res = await fetch(`${API_BASE}/api/wifi/status`);
    if (!res.ok) throw new Error("Failed to query Wi-Fi status");
    return res.json();
  },

  async scanWifiNetworks(): Promise<WiFiNetwork[]> {
    const res = await fetch(`${API_BASE}/api/wifi/scan`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to scan Wi-Fi networks");
    return res.json();
  },

  async getLiveReading(ssid: string, bssid?: string): Promise<any> {
    const params = new URLSearchParams({ ssid });
    if (bssid) params.append("bssid", bssid);
    const res = await fetch(`${API_BASE}/api/wifi/live-reading?${params}`);
    if (!res.ok) return null;
    return res.json();
  },

  async listSurveys(): Promise<SurveySession[]> {
    const res = await fetch(`${API_BASE}/api/surveys`);
    if (!res.ok) throw new Error("Failed to fetch surveys");
    return res.json();
  },

  async createSurvey(data: {
    name?: string;
    selected_ssid: string;
    selected_bssid?: string;
    positioning_mode?: string;
    notes?: string;
  }): Promise<SurveySession> {
    const res = await fetch(`${API_BASE}/api/surveys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create survey session");
    return res.json();
  },

  async getSurvey(id: string): Promise<SurveySession> {
    const res = await fetch(`${API_BASE}/api/surveys/${id}`);
    if (!res.ok) throw new Error("Failed to fetch survey");
    return res.json();
  },

  async completeSurvey(id: string): Promise<SurveySession> {
    const res = await fetch(`${API_BASE}/api/surveys/${id}/complete`, { method: "PUT" });
    if (!res.ok) throw new Error("Failed to complete survey");
    return res.json();
  },

  async deleteSurvey(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/surveys/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete survey");
  },

  async addMeasurement(data: {
    session_id: string;
    latitude?: number;
    longitude?: number;
    accuracy_meters?: number;
    x?: number;
    y?: number;
    rssi?: number;
    signal_quality?: number;
    channel?: number;
    band?: string;
    frequency?: number;
    radio_type?: string;
  }): Promise<Measurement> {
    const res = await fetch(`${API_BASE}/api/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to record measurement");
    }
    return res.json();
  },

  async getMeasurements(sessionId: string): Promise<Measurement[]> {
    const res = await fetch(`${API_BASE}/api/measurements/${sessionId}`);
    if (!res.ok) throw new Error("Failed to fetch measurements");
    return res.json();
  },

  async getCoverageGrid(sessionId: string): Promise<CoverageGrid> {
    const res = await fetch(`${API_BASE}/api/coverage/${sessionId}`);
    if (!res.ok) throw new Error("Failed to fetch coverage grid");
    return res.json();
  },

  async getDeadZones(sessionId: string): Promise<DeadZone[]> {
    const res = await fetch(`${API_BASE}/api/dead-zones/${sessionId}`);
    if (!res.ok) throw new Error("Failed to fetch dead zones");
    return res.json();
  },

  async getAnalysis(sessionId: string): Promise<CoverageAnalysis> {
    const res = await fetch(`${API_BASE}/api/analysis/${sessionId}`);
    if (!res.ok) throw new Error("Failed to fetch analysis");
    return res.json();
  },

  async getRecommendations(sessionId: string): Promise<RecommendationsResponse> {
    const res = await fetch(`${API_BASE}/api/recommendations/${sessionId}`);
    if (!res.ok) throw new Error("Failed to fetch recommendations");
    return res.json();
  },

  async compareSurveys(surveyA: string, surveyB: string): Promise<SurveyComparison> {
    const res = await fetch(`${API_BASE}/api/compare?survey_a=${surveyA}&survey_b=${surveyB}`);
    if (!res.ok) throw new Error("Failed to compare surveys");
    return res.json();
  },

  async getReport(sessionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/reports/${sessionId}`);
    if (!res.ok) throw new Error("Failed to fetch survey report");
    return res.json();
  },

  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
  },

  async updateSettings(settings: AppSettings): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  },

  async generateDemoSurvey(): Promise<SurveySession> {
    const res = await fetch(`${API_BASE}/api/demo/generate`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate demo dataset");
    return res.json();
  },

  async clearDemoSurveys(): Promise<void> {
    await fetch(`${API_BASE}/api/demo/clear`, { method: "DELETE" });
  }
};
