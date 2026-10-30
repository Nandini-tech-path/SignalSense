import React, { useEffect, useState } from "react";
import {
  api,
  SurveySession,
  CoverageAnalysis,
  RecommendationsResponse,
} from "../services/api";
import { formatClassificationName, getRssiColor, getSignalColor } from "../utils/signal";
import {
  TrendingUp,
  Radio,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Activity,
  Zap,
} from "lucide-react";

interface AnalysisPageProps {
  currentSurvey: SurveySession | null;
  surveys?: SurveySession[];
  onSelectSurvey?: (survey: SurveySession) => void;
  onNavigateToDeadZones: () => void;
  onNavigateToMap: () => void;
  onNavigateToReport: () => void;
  onStartSurvey?: () => void;
  onLoadDemo?: () => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  currentSurvey,
  surveys = [],
  onSelectSurvey,
  onNavigateToDeadZones,
  onNavigateToMap,
  onNavigateToReport,
  onStartSurvey,
  onLoadDemo,
}) => {
  const [analysis, setAnalysis] = useState<CoverageAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentSurvey) return;

    const loadAnalysis = async () => {
      setLoading(true);
      try {
        const [a, r] = await Promise.all([
          api.getAnalysis(currentSurvey.id),
          api.getRecommendations(currentSurvey.id),
        ]);
        setAnalysis(a);
        setRecommendations(r);
      } catch (err) {
        console.error("Failed to load analysis:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [currentSurvey]);

  if (!currentSurvey) {
    return (
      <div className="empty-state" style={{ maxWidth: 680, margin: "60px auto" }}>
        <TrendingUp className="empty-state-icon" />
        <h3 className="empty-state-title">No Survey Available for Analysis</h3>
        <p className="empty-state-desc">
          Complete a Wi-Fi survey or load sample data to generate comprehensive RF metrics and propagation analysis.
        </p>

        {surveys.length > 0 && onSelectSurvey && (
          <div style={{ margin: "20px 0", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 8, textAlign: "left" }}>
              Select a previous survey to analyze:
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
                  <span style={{ fontSize: "0.8rem", color: "#60a5fa" }}>Analyze &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
          {onStartSurvey && (
            <button className="btn-primary" onClick={onStartSurvey}>
              Start Wi-Fi Survey
            </button>
          )}
          {onLoadDemo && (
            <button className="btn-secondary" onClick={onLoadDemo}>
              Load Demo Dataset
            </button>
          )}
        </div>
      </div>
    );
  }

  const cls = analysis?.classifications || { excellent: 0, good: 0, fair: 0, weak: 0, dead: 0 };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          padding: "20px 26px",
        }}
      >
        <div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
            COVERAGE ANALYSIS &bull; {analysis?.selected_ssid || currentSurvey.selected_ssid}
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", marginTop: 2 }}>
            Network Propagation &amp; Health Report
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-secondary" onClick={onNavigateToMap}>
            View Map
          </button>
          <button className="btn-primary" onClick={onNavigateToReport}>
            Export Audit Report
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {/* Overall Usable Coverage */}
        <div className="card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
            Overall Usable Coverage
          </div>
          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              color: (analysis?.coverage_score ?? 0) >= 80 ? "var(--sig-excellent)" : "var(--sig-fair)",
            }}
          >
            {analysis?.coverage_score ?? 0}%
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            Signal &ge; -70 dBm (Fair or better)
          </div>
        </div>

        {/* Strongest Signal */}
        <div className="card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
            Strongest Measured Signal
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 800, color: getRssiColor(analysis?.strongest_rssi ?? -90) }}>
            {analysis?.strongest_rssi !== null ? `${analysis?.strongest_rssi} dBm` : "—"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            Proximity to Access Point
          </div>
        </div>

        {/* Weakest Signal */}
        <div className="card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
            Weakest Measured Signal
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 800, color: getRssiColor(analysis?.weakest_rssi ?? -90) }}>
            {analysis?.weakest_rssi !== null ? `${analysis?.weakest_rssi} dBm` : "—"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            Edge / Obstructed Region
          </div>
        </div>

        {/* Dead Zones */}
        <div
          className="card"
          onClick={onNavigateToDeadZones}
          style={{ cursor: "pointer", transition: "border 0.15s" }}
        >
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
            Dead Zones (&lt; -80 dBm)
          </div>
          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              color: (analysis?.dead_zone_count ?? 0) > 0 ? "var(--sig-dead)" : "var(--sig-excellent)",
            }}
          >
            {analysis?.dead_zone_count ?? 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            Click to view exact locations &rarr;
          </div>
        </div>
      </div>

      {/* Signal Distribution Breakdown Bars */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 16 }}>
          Signal Quality Distribution
        </h2>

        {/* Stacked Percentage Bar */}
        <div
          style={{
            height: 24,
            width: "100%",
            borderRadius: 6,
            overflow: "hidden",
            display: "flex",
            marginBottom: 20,
            background: "var(--bg-tertiary)",
          }}
        >
          {cls.excellent > 0 && (
            <div style={{ width: `${cls.excellent}%`, background: "var(--sig-excellent)" }} title={`Excellent: ${cls.excellent}%`} />
          )}
          {cls.good > 0 && (
            <div style={{ width: `${cls.good}%`, background: "var(--sig-good)" }} title={`Good: ${cls.good}%`} />
          )}
          {cls.fair > 0 && (
            <div style={{ width: `${cls.fair}%`, background: "var(--sig-fair)" }} title={`Fair: ${cls.fair}%`} />
          )}
          {cls.weak > 0 && (
            <div style={{ width: `${cls.weak}%`, background: "var(--sig-weak)" }} title={`Weak: ${cls.weak}%`} />
          )}
          {cls.dead > 0 && (
            <div style={{ width: `${cls.dead}%`, background: "var(--sig-dead)" }} title={`Dead: ${cls.dead}%`} />
          )}
        </div>

        {/* Detailed Tier Table */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div style={{ padding: 12, background: "rgba(16, 185, 129, 0.08)", borderRadius: 6, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <div style={{ color: "var(--sig-excellent)", fontWeight: 700, fontSize: "1.1rem" }}>{cls.excellent}%</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff", marginTop: 2 }}>Excellent</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>&ge; -50 dBm</div>
          </div>

          <div style={{ padding: 12, background: "rgba(20, 184, 166, 0.08)", borderRadius: 6, border: "1px solid rgba(20, 184, 166, 0.2)" }}>
            <div style={{ color: "var(--sig-good)", fontWeight: 700, fontSize: "1.1rem" }}>{cls.good}%</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff", marginTop: 2 }}>Good</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>-50 to -60 dBm</div>
          </div>

          <div style={{ padding: 12, background: "rgba(245, 158, 11, 0.08)", borderRadius: 6, border: "1px solid rgba(245, 158, 11, 0.2)" }}>
            <div style={{ color: "var(--sig-fair)", fontWeight: 700, fontSize: "1.1rem" }}>{cls.fair}%</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff", marginTop: 2 }}>Fair</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>-60 to -70 dBm</div>
          </div>

          <div style={{ padding: 12, background: "rgba(249, 115, 22, 0.08)", borderRadius: 6, border: "1px solid rgba(249, 115, 22, 0.2)" }}>
            <div style={{ color: "var(--sig-weak)", fontWeight: 700, fontSize: "1.1rem" }}>{cls.weak}%</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff", marginTop: 2 }}>Weak</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>-70 to -80 dBm</div>
          </div>

          <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.08)", borderRadius: 6, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <div style={{ color: "var(--sig-dead)", fontWeight: 700, fontSize: "1.1rem" }}>{cls.dead}%</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff", marginTop: 2 }}>Dead Zone</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>&lt; -80 dBm</div>
          </div>
        </div>
      </div>

      {/* Networking Recommendations Section */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Lightbulb size={20} color="#fbbf24" />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
            Network Engineering Recommendations
          </h2>
        </div>

        {recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {recommendations.recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "var(--radius-md)",
                  padding: 18,
                  borderLeft: `4px solid ${
                    rec.severity === "critical"
                      ? "var(--sig-dead)"
                      : rec.severity === "warning"
                      ? "var(--sig-fair)"
                      : "var(--accent-blue)"
                  }`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "#fff" }}>
                    {rec.title}
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background:
                        rec.severity === "critical"
                          ? "rgba(239, 68, 68, 0.2)"
                          : "rgba(59, 130, 246, 0.2)",
                      color: rec.severity === "critical" ? "#f87171" : "#60a5fa",
                    }}
                  >
                    {rec.category}
                  </span>
                </div>

                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                  {rec.description}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                      Possible Causes
                    </div>
                    <ul style={{ paddingLeft: 18, fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
                      {rec.possible_causes.map((cause, ci) => (
                        <li key={ci}>{cause}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                      Suggested Actions
                    </div>
                    <ul style={{ paddingLeft: 18, fontSize: "0.82rem", color: "#60a5fa", display: "flex", flexDirection: "column", gap: 3 }}>
                      {rec.suggested_actions.map((act, ai) => (
                        <li key={ai}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            Survey coverage is balanced. No critical RF interventions detected.
          </div>
        )}
      </div>
    </div>
  );
};
