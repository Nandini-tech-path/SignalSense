import React, { useEffect, useState } from "react";
import { api, SurveySession, DeadZone } from "../services/api";
import { getRssiColor } from "../utils/signal";
import { AlertTriangle, ShieldCheck, MapPin, ArrowRight, Eye, Radio } from "lucide-react";

interface DeadZonesPageProps {
  currentSurvey: SurveySession | null;
  surveys?: SurveySession[];
  onSelectSurvey?: (survey: SurveySession) => void;
  onViewOnMap: (deadZone: DeadZone) => void;
  onStartSurvey: () => void;
  onLoadDemo?: () => void;
}

export const DeadZonesPage: React.FC<DeadZonesPageProps> = ({
  currentSurvey,
  surveys = [],
  onSelectSurvey,
  onViewOnMap,
  onStartSurvey,
  onLoadDemo,
}) => {
  const [deadZones, setDeadZones] = useState<DeadZone[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentSurvey) return;

    const loadDeadZones = async () => {
      setLoading(true);
      try {
        const data = await api.getDeadZones(currentSurvey.id);
        setDeadZones(data);
      } catch (err) {
        console.error("Failed to load dead zones:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDeadZones();
  }, [currentSurvey]);

  if (!currentSurvey) {
    return (
      <div className="empty-state" style={{ maxWidth: 680, margin: "60px auto" }}>
        <Radio className="empty-state-icon" />
        <h3 className="empty-state-title">No Survey Selected</h3>
        <p className="empty-state-desc">
          Run or select a survey to review detected dead zones, signal attenuation, and radio shadow areas.
        </p>

        {surveys.length > 0 && onSelectSurvey && (
          <div style={{ margin: "20px 0", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 8, textAlign: "left" }}>
              Select a survey to inspect dead zones:
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
                      {s.selected_ssid} &bull; {s.dead_zone_count} dead zones
                    </div>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "#60a5fa" }}>Inspect &rarr;</span>
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

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
          RF DEAD ZONE LOG &bull; {currentSurvey.selected_ssid}
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", marginTop: 2 }}>
          {deadZones.length} Dead Zone{deadZones.length !== 1 ? "s" : ""} Detected
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: 4 }}>
          Dead zones represent locations where signal strength drops below -80 dBm, leading to lost packets, high latency, or total connection drops.
        </p>
      </div>

      {deadZones.length === 0 ? (
        <div className="empty-state">
          <ShieldCheck className="empty-state-icon" style={{ color: "var(--sig-excellent)" }} />
          <h3 className="empty-state-title">No Dead Zones Detected</h3>
          <p className="empty-state-desc">
            All measured locations in <strong>{currentSurvey.selected_ssid}</strong> currently meet or exceed minimum viable operational thresholds. Continue surveying adjacent rooms or fringe areas to verify complete coverage.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {deadZones.map((dz, idx) => (
            <div
              key={dz.id}
              className="card"
              style={{
                borderLeft: "4px solid var(--sig-dead)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
                padding: "20px 24px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                    Dead Zone {String(idx + 1).padStart(2, "0")}
                  </h3>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "rgba(239, 68, 68, 0.2)",
                      color: "#f87171",
                    }}
                  >
                    {dz.severity} Severity
                  </span>
                </div>

                <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: 6, display: "flex", alignItems: "center", gap: 16 }}>
                  <span>
                    Signal: <strong style={{ color: getRssiColor(dz.rssi) }}>{dz.rssi} dBm</strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Location:{" "}
                    <strong>
                      {dz.latitude && dz.longitude
                        ? `${dz.latitude.toFixed(5)}, ${dz.longitude.toFixed(5)}`
                        : `X: ${Math.round(dz.x || 0)}m, Y: ${Math.round(dz.y || 0)}m`}
                    </strong>
                  </span>
                  <span>&bull;</span>
                  <span>{new Date(dz.timestamp).toLocaleTimeString()}</span>
                </div>

                {dz.probable_causes && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8 }}>
                    Possible causes: {dz.probable_causes}
                  </div>
                )}
              </div>

              <button
                className="btn-secondary"
                onClick={() => onViewOnMap(dz)}
                style={{ fontSize: "0.85rem", padding: "8px 16px" }}
              >
                <Eye size={15} />
                View on Map
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
