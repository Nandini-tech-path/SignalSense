import React, { useEffect, useState } from "react";
import {
  api,
  SurveySession,
  Measurement,
  DeadZone,
  CoverageGrid,
} from "../services/api";
import { CoverageMapCanvas } from "../components/CoverageMapCanvas";
import { CoverageMapLeaflet } from "../components/CoverageMapLeaflet";
import { formatClassificationName, getRssiColor } from "../utils/signal";
import {
  Layers,
  MapPin,
  AlertTriangle,
  Radio,
  FileText,
  TrendingUp,
  Compass,
  ArrowRight,
  Info
} from "lucide-react";

interface CoverageMapPageProps {
  currentSurvey: SurveySession | null;
  surveys?: SurveySession[];
  onSelectSurvey?: (survey: SurveySession) => void;
  onNavigateToAnalysis: () => void;
  onNavigateToDeadZones: () => void;
  onStartSurvey: () => void;
  onLoadDemo?: () => void;
}

export const CoverageMapPage: React.FC<CoverageMapPageProps> = ({
  currentSurvey,
  surveys = [],
  onSelectSurvey,
  onNavigateToAnalysis,
  onNavigateToDeadZones,
  onStartSurvey,
  onLoadDemo,
}) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [deadZones, setDeadZones] = useState<DeadZone[]>([]);
  const [coverageGrid, setCoverageGrid] = useState<CoverageGrid | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<Measurement | null>(null);
  const [loading, setLoading] = useState(false);
  const [useGpsView, setUseGpsView] = useState(false);

  useEffect(() => {
    if (!currentSurvey) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [meas, dz, grid] = await Promise.all([
          api.getMeasurements(currentSurvey.id),
          api.getDeadZones(currentSurvey.id),
          api.getCoverageGrid(currentSurvey.id),
        ]);
        setMeasurements(meas);
        setDeadZones(dz);
        setCoverageGrid(grid);

        // Check if geographic GPS coordinates exist
        const hasGps = meas.some((m) => m.latitude !== null && m.longitude !== null);
        setUseGpsView(hasGps && currentSurvey.positioning_mode === "gps");
      } catch (err) {
        console.error("Failed to load map data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentSurvey]);

  if (!currentSurvey) {
    return (
      <div className="empty-state" style={{ maxWidth: 680, margin: "60px auto" }}>
        <Radio className="empty-state-icon" />
        <h3 className="empty-state-title">No Active Survey Selected</h3>
        <p className="empty-state-desc">
          Select or begin a Wi-Fi survey to visualize Inverse Distance Weighting (IDW) signal propagation and dead zones on the coverage map.
        </p>

        {surveys.length > 0 && onSelectSurvey && (
          <div style={{ margin: "20px 0", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 8, textAlign: "left" }}>
              Select from previous survey sessions:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {surveys.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  className="card"
                  onClick={() => onSelectSurvey(s)}
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    border: "1px solid var(--border-color)",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem" }}>{s.name}</div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      {s.selected_ssid} &bull; {s.total_measurements} points
                    </div>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "#60a5fa" }}>View Map &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
          <button className="btn-primary" onClick={onStartSurvey}>
            Start Wi-Fi Survey
          </button>
          {onLoadDemo && (
            <button className="btn-secondary" onClick={onLoadDemo}>
              Load Demo Dataset
            </button>
          )}
        </div>
      </div>
    );
  }

  const hasGeoPoints = measurements.some((m) => m.latitude !== null && m.latitude !== undefined);

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          padding: "18px 24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
              COVERAGE MAP &bull;
            </span>
            <span style={{ fontSize: "0.8rem", color: "#60a5fa", fontWeight: 600 }}>
              {currentSurvey.selected_ssid}
            </span>
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 700, color: "#fff", marginTop: 2 }}>
            {currentSurvey.name}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {hasGeoPoints && (
            <button
              className="btn-secondary"
              onClick={() => setUseGpsView(!useGpsView)}
              style={{ fontSize: "0.85rem" }}
            >
              <Compass size={14} />
              {useGpsView ? "Switch to Canvas Grid" : "Switch to Satellite / GPS"}
            </button>
          )}

          <button className="btn-secondary" onClick={onNavigateToDeadZones} style={{ fontSize: "0.85rem" }}>
            <AlertTriangle size={14} color="var(--sig-dead)" />
            Dead Zones ({deadZones.length})
          </button>

          <button className="btn-primary" onClick={onNavigateToAnalysis} style={{ fontSize: "0.85rem" }}>
            <TrendingUp size={14} />
            View Analysis
          </button>
        </div>
      </div>

      {/* Insufficient Measurements Warning Banner */}
      {measurements.length < 3 && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#fbbf24",
            fontSize: "0.88rem",
          }}
        >
          <Info size={18} />
          <div>
            <strong>Collect more measurements to generate a reliable coverage map.</strong>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>
              Currently recorded: {measurements.length} point{measurements.length !== 1 ? "s" : ""}. Inverse Distance Weighting spatial interpolation requires at least 3 points.
            </div>
          </div>
        </div>
      )}

      {/* Main Map Presentation */}
      <div className="card" style={{ padding: 20 }}>
        {useGpsView ? (
          <CoverageMapLeaflet measurements={measurements} deadZones={deadZones} height={520} />
        ) : (
          <CoverageMapCanvas
            measurements={measurements}
            deadZones={deadZones}
            heatmapCells={coverageGrid?.cells || []}
            selectedPointId={selectedPoint?.id}
            onSelectPoint={(p) => setSelectedPoint(p)}
            height={520}
          />
        )}
      </div>

      {/* Detailed Point Inspector Card if selected */}
      {selectedPoint && (
        <div
          className="card"
          style={{
            padding: "18px 24px",
            borderLeft: `4px solid ${getRssiColor(selectedPoint.rssi)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              POINT INSPECTION
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginTop: 2 }}>
              Measurement #{selectedPoint.id} &bull; {formatClassificationName(selectedPoint.classification)}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 4 }}>
              Timestamp: {new Date(selectedPoint.timestamp).toLocaleString()}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>RSSI</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: getRssiColor(selectedPoint.rssi) }}>
                {selectedPoint.rssi} dBm
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>QUALITY</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>
                {selectedPoint.signal_quality}%
              </div>
            </div>
            {selectedPoint.band && (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>BAND</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>
                  {selectedPoint.band}
                </div>
              </div>
            )}
            {selectedPoint.channel && (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>CHANNEL</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>
                  {selectedPoint.channel}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
