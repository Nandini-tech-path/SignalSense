import React, { useEffect, useState } from "react";
import { api, AdapterStatus, SurveySession } from "../services/api";
import { Radio, MapPin, HardDrive, Cpu, ArrowRight, Play, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";

interface OverviewPageProps {
  onStartSurvey: () => void;
  onOpenSurvey: (survey: SurveySession) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onStartSurvey, onOpenSurvey }) => {
  const [adapterStatus, setAdapterStatus] = useState<AdapterStatus | null>(null);
  const [surveys, setSurveys] = useState<SurveySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [status, surveyList] = await Promise.all([
          api.getWifiStatus(),
          api.listSurveys(),
        ]);
        setAdapterStatus(status);
        setSurveys(surveyList);
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute aggregated real statistics from existing database surveys
  const completedSurveys = surveys.filter((s) => s.status === "completed" || s.total_measurements > 0);
  const totalMeasurements = completedSurveys.reduce((acc, s) => acc + (s.total_measurements || 0), 0);
  const totalDeadZones = completedSurveys.reduce((acc, s) => acc + (s.dead_zone_count || 0), 0);
  const avgCoverage =
    completedSurveys.length > 0
      ? Math.round(
          completedSurveys.reduce((acc, s) => acc + (s.coverage_score || 0), 0) / completedSurveys.length
        )
      : null;

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: 36 }}>
      {/* Hero Section */}
      <div
        style={{
          background: "linear-gradient(180deg, rgba(26, 34, 52, 0.7) 0%, rgba(17, 24, 39, 0.4) 100%)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "44px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#60a5fa", fontSize: "0.85rem", fontWeight: 600 }}>
          <Radio size={16} />
          PORTABLE RF RECONNAISSANCE & MAPPING PLATFORM
        </div>

        <div>
          <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#ffffff", lineHeight: 1.15 }}>
            Understand your Wi-Fi.<br />Find where it fails.
          </h1>
          <p
            style={{
              fontSize: "1.05rem",
              color: "var(--text-secondary)",
              maxWidth: 680,
              marginTop: 14,
              lineHeight: 1.6,
            }}
          >
            SignalSense scans nearby Wi-Fi networks, measures real signal strength as you move,
            maps the measurements, and identifies weak and dead zones.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
          <button className="btn-primary" onClick={onStartSurvey} style={{ padding: "12px 24px", fontSize: "1rem" }}>
            <Play size={18} fill="currentColor" />
            Start Wi-Fi Survey
          </button>
        </div>
      </div>

      {/* System Readiness Checklist */}
      <div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
          System Readiness
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {/* Adapter */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)" }}>
                <Cpu size={18} />
                <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>Wi-Fi Adapter</span>
              </div>
              {adapterStatus?.available ? (
                <span style={{ color: "var(--sig-excellent)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem", fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> Ready
                </span>
              ) : (
                <span style={{ color: "var(--sig-dead)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem", fontWeight: 600 }}>
                  <AlertCircle size={16} /> Offline
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {adapterStatus?.description || "Hardware scan pending"}
            </div>
            {adapterStatus?.connected_network && (
              <div style={{ fontSize: "0.78rem", color: "#60a5fa", marginTop: 6, fontWeight: 500 }}>
                Connected to: {adapterStatus.connected_network.ssid}
              </div>
            )}
          </div>

          {/* Location Services */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)" }}>
                <MapPin size={18} />
                <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>Location Services</span>
              </div>
              <span style={{ color: "var(--sig-excellent)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem", fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Available
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Browser Geolocation &amp; Indoor Grid Mode
            </div>
          </div>

          {/* Scanner */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)" }}>
                <Radio size={18} />
                <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>RF Scanner</span>
              </div>
              <span style={{ color: "var(--sig-excellent)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem", fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Ready
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Native Windows wlanapi / netsh engine
            </div>
          </div>

          {/* Storage */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)" }}>
                <HardDrive size={18} />
                <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>Storage</span>
              </div>
              <span style={{ color: "var(--sig-excellent)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem", fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Ready
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              SQLite local persistence active
            </div>
          </div>
        </div>
      </div>

      {/* Historical Survey Summary or Empty State */}
      <div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
          Survey Activity
        </h2>

        {surveys.length === 0 ? (
          <div className="empty-state">
            <Radio className="empty-state-icon" />
            <h3 className="empty-state-title">No surveys yet</h3>
            <p className="empty-state-desc">
              Start your first Wi-Fi survey to detect nearby networks and map dead zones across your environment.
            </p>
            <button className="btn-primary" onClick={onStartSurvey}>
              Start Wi-Fi Survey
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick Metrics from Database */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
                  Total Surveys
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff" }}>
                  {surveys.length}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
                  Total Measurements
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff" }}>
                  {totalMeasurements}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
                  Average Usable Coverage
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: avgCoverage ? "#34d399" : "#fff" }}>
                  {avgCoverage !== null ? `${avgCoverage}%` : "—"}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
                  Dead Zones Found
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: totalDeadZones > 0 ? "#f87171" : "#fff" }}>
                  {totalDeadZones}
                </div>
              </div>
            </div>

            {/* Recent Surveys Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", fontWeight: 600, fontSize: "0.92rem" }}>
                Recent Surveys
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {surveys.slice(0, 4).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onOpenSurvey(s)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--border-color)",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#fff" }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>
                        Network: <strong>{s.selected_ssid}</strong> &bull; {new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: s.coverage_score && s.coverage_score >= 80 ? "var(--sig-excellent)" : "var(--sig-fair)" }}>
                          {s.coverage_score ? `${s.coverage_score}% coverage` : `${s.total_measurements} pts`}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {s.dead_zone_count} dead zone(s)
                        </div>
                      </div>
                      <ArrowRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
