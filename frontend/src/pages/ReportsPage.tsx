import React, { useEffect, useState } from "react";
import { api, SurveySession } from "../services/api";
import { formatClassificationName, getRssiColor } from "../utils/signal";
import { Printer, FileDown, Radio, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface ReportsPageProps {
  currentSurvey: SurveySession | null;
  surveys?: SurveySession[];
  onSelectSurvey?: (survey: SurveySession) => void;
  onStartSurvey: () => void;
  onLoadDemo?: () => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  currentSurvey,
  surveys = [],
  onSelectSurvey,
  onStartSurvey,
  onLoadDemo,
}) => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentSurvey) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await api.getReport(currentSurvey.id);
        setReportData(data);
      } catch (err) {
        console.error("Failed to load report:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [currentSurvey]);

  if (!currentSurvey) {
    return (
      <div className="empty-state" style={{ maxWidth: 680, margin: "60px auto" }}>
        <Radio className="empty-state-icon" />
        <h3 className="empty-state-title">No Survey Selected for Reporting</h3>
        <p className="empty-state-desc">
          Run or select a Wi-Fi survey to generate an exportable engineering audit report and coverage certificates.
        </p>

        {surveys.length > 0 && onSelectSurvey && (
          <div style={{ margin: "20px 0", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 8, textAlign: "left" }}>
              Select a survey to view report:
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
                      {s.selected_ssid} &bull; Score: {s.coverage_score ? `${s.coverage_score}%` : "Recorded"}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "#60a5fa" }}>Generate &rarr;</span>
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

  const handlePrint = () => {
    window.print();
  };

  const stats = reportData?.statistics;
  const deadZones = reportData?.dead_zones || [];
  const recs = reportData?.recommendations?.recommendations || [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Print / Export Action Bar */}
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          padding: "14px 20px",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            SURVEY REPORT &bull; Ready to print or export to PDF
          </span>
        </div>

        <button className="btn-primary" onClick={handlePrint} style={{ fontSize: "0.85rem" }}>
          <Printer size={16} />
          Print / Save as PDF
        </button>
      </div>

      {/* Formal Printable Document Sheet */}
      <div
        id="printable-report"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: 40,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Document Header */}
        <div style={{ borderBottom: "2px solid var(--border-color)", paddingBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#60a5fa", letterSpacing: "0.08em" }}>
                SIGNALSENSE &bull; NETWORK AUDIT REPORT
              </div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", marginTop: 4 }}>
                {currentSurvey.name}
              </h1>
            </div>

            <div style={{ textAlign: "right", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              <div>Date: {new Date(currentSurvey.created_at).toLocaleDateString()}</div>
              <div>Status: <strong>{currentSurvey.status.toUpperCase()}</strong></div>
            </div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Executive Coverage Summary
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div style={{ padding: 14, background: "var(--bg-tertiary)", borderRadius: 8 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Target SSID</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginTop: 2 }}>
                {currentSurvey.selected_ssid}
              </div>
            </div>

            <div style={{ padding: 14, background: "var(--bg-tertiary)", borderRadius: 8 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Usable Coverage</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: (stats?.coverage_score ?? 0) >= 80 ? "#34d399" : "#fbbf24", marginTop: 2 }}>
                {stats?.coverage_score ?? 0}%
              </div>
            </div>

            <div style={{ padding: 14, background: "var(--bg-tertiary)", borderRadius: 8 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Dead Zones</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: (stats?.dead_zone_count ?? 0) > 0 ? "#f87171" : "#34d399", marginTop: 2 }}>
                {stats?.dead_zone_count ?? 0}
              </div>
            </div>

            <div style={{ padding: 14, background: "var(--bg-tertiary)", borderRadius: 8 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Samples</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginTop: 2 }}>
                {stats?.total_measurements ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Signal Tier Distribution */}
        {stats && (
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              Signal Distribution
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div style={{ padding: 10, background: "rgba(16, 185, 129, 0.1)", borderRadius: 6 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--sig-excellent)", fontWeight: 600 }}>Excellent (&ge; -50 dBm)</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>{stats.classifications?.excellent}%</div>
              </div>
              <div style={{ padding: 10, background: "rgba(20, 184, 166, 0.1)", borderRadius: 6 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--sig-good)", fontWeight: 600 }}>Good (-50 to -60)</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>{stats.classifications?.good}%</div>
              </div>
              <div style={{ padding: 10, background: "rgba(245, 158, 11, 0.1)", borderRadius: 6 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--sig-fair)", fontWeight: 600 }}>Fair (-60 to -70)</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>{stats.classifications?.fair}%</div>
              </div>
              <div style={{ padding: 10, background: "rgba(249, 115, 22, 0.1)", borderRadius: 6 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--sig-weak)", fontWeight: 600 }}>Weak (-70 to -80)</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>{stats.classifications?.weak}%</div>
              </div>
              <div style={{ padding: 10, background: "rgba(239, 68, 68, 0.1)", borderRadius: 6 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--sig-dead)", fontWeight: 600 }}>Dead Zone (&lt; -80)</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>{stats.classifications?.dead}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Dead Zones Log */}
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Identified Dead Zones ({deadZones.length})
          </h2>
          {deadZones.length === 0 ? (
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              No dead zones detected along the surveyed walking path.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {deadZones.map((dz: any, i: number) => (
                <div key={i} style={{ padding: 12, background: "var(--bg-tertiary)", borderRadius: 6, borderLeft: "3px solid var(--sig-dead)", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ color: "#fff" }}>Dead Zone #{i + 1}</strong>
                    <span style={{ color: "#f87171", fontWeight: 600 }}>{dz.rssi} dBm &bull; {dz.severity.toUpperCase()}</span>
                  </div>
                  <div style={{ color: "var(--text-secondary)", marginTop: 4 }}>
                    {dz.probable_causes}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Engineering Actions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recs.map((r: any, i: number) => (
              <div key={i} style={{ padding: 14, background: "var(--bg-tertiary)", borderRadius: 8 }}>
                <div style={{ fontWeight: 700, color: "#60a5fa", fontSize: "0.92rem" }}>
                  {r.title}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 4 }}>
                  {r.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
