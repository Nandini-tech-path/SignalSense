import React, { useEffect, useState } from "react";
import { api, SurveySession, SurveyComparison } from "../services/api";
import { History, ArrowRight, GitCompare, Trash2, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";

interface HistoryPageProps {
  onOpenSurvey: (survey: SurveySession) => void;
  onStartSurvey: () => void;
  onLoadDemo?: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenSurvey, onStartSurvey, onLoadDemo }) => {
  const [surveys, setSurveys] = useState<SurveySession[]>([]);
  const [loading, setLoading] = useState(true);

  // Comparison state
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<SurveyComparison | null>(null);
  const [comparing, setComparing] = useState(false);

  const fetchSurveys = async () => {
    setLoading(false);
    try {
      const data = await api.listSurveys();
      setSurveys(data);
    } catch (err) {
      console.error("Failed to load surveys:", err);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this survey?")) return;
    try {
      await api.deleteSurvey(id);
      setSurveys((prev) => prev.filter((s) => s.id !== id));
      setSelectedForCompare((prev) => prev.filter((sId) => sId !== id));
      if (comparisonResult && (comparisonResult.survey_a.id === id || comparisonResult.survey_b.id === id)) {
        setComparisonResult(null);
      }
    } catch (err) {
      console.error("Failed to delete survey:", err);
    }
  };

  const toggleSelectForCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare((prev) => prev.filter((sId) => sId !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        setSelectedForCompare([selectedForCompare[1], id]);
      } else {
        setSelectedForCompare((prev) => [...prev, id]);
      }
    }
  };

  const handleRunComparison = async () => {
    if (selectedForCompare.length !== 2) return;
    setComparing(true);
    try {
      const res = await api.compareSurveys(selectedForCompare[0], selectedForCompare[1]);
      setComparisonResult(res);
    } catch (err) {
      console.error("Comparison error:", err);
    } finally {
      setComparing(false);
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff" }}>
            Survey History &amp; Comparison
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: 4 }}>
            Review past survey snapshots or compare two surveys to evaluate router repositioning improvements.
          </p>
        </div>

        {selectedForCompare.length === 2 && (
          <button className="btn-primary" onClick={handleRunComparison} disabled={comparing}>
            <GitCompare size={16} />
            {comparing ? "Comparing..." : "Compare Selected (2)"}
          </button>
        )}
      </div>

      {/* Comparison Modal / Result Card */}
      {comparisonResult && (
        <div
          className="card"
          style={{
            background: "linear-gradient(180deg, rgba(26, 34, 52, 0.95) 0%, rgba(17, 24, 39, 0.9) 100%)",
            border: "1px solid #3b82f6",
            padding: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <GitCompare size={20} color="#60a5fa" />
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
                Survey Comparison: Before vs After
              </h2>
            </div>
            <button className="btn-secondary" onClick={() => setComparisonResult(null)} style={{ padding: "4px 10px", fontSize: "0.8rem" }}>
              Dismiss
            </button>
          </div>

          <p style={{ fontSize: "0.92rem", color: "#93c5fd", marginBottom: 20, fontWeight: 500 }}>
            {comparisonResult.improvement_summary}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {comparisonResult.comparison_points.map((pt, idx) => (
              <div key={idx} style={{ padding: 14, background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 4 }}>
                  {pt.metric}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                    {pt.survey_a_val} &rarr; {pt.survey_b_val}
                  </div>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: pt.improved ? "#34d399" : "#f87171",
                    }}
                  >
                    {pt.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Survey Cards */}
      {surveys.length === 0 ? (
        <div className="empty-state">
          <History className="empty-state-icon" />
          <h3 className="empty-state-title">No Previous Surveys</h3>
          <p className="empty-state-desc">
            Your completed surveys will appear here for historical tracking, analysis, and comparison.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
            <button className="btn-primary" onClick={onStartSurvey}>
              Start First Survey
            </button>
            {onLoadDemo && (
              <button className="btn-secondary" onClick={onLoadDemo}>
                Load Demo Dataset
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {surveys.map((s) => {
            const isSelected = selectedForCompare.includes(s.id);
            return (
              <div
                key={s.id}
                className="card"
                onClick={() => onOpenSurvey(s)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  padding: "18px 22px",
                  border: isSelected ? "2px solid #3b82f6" : "1px solid var(--border-color)",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelectForCompare(s.id, e as any)}
                    onClick={(e) => e.stopPropagation()}
                    title="Select to compare"
                    style={{ width: 16, height: 16, accentColor: "var(--accent-blue)", cursor: "pointer" }}
                  />

                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                      {s.name}
                      {s.is_demo && (
                        <span style={{ marginLeft: 8, fontSize: "0.72rem", background: "rgba(100, 116, 139, 0.25)", color: "#cbd5e1", padding: "2px 6px", borderRadius: 4 }}>
                          Demo Dataset
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      Network: <strong>{s.selected_ssid}</strong> &bull; {new Date(s.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: s.coverage_score && s.coverage_score >= 80 ? "var(--sig-excellent)" : "var(--sig-fair)",
                      }}
                    >
                      {s.coverage_score ? `${s.coverage_score}% Coverage` : `${s.total_measurements} Samples`}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {s.dead_zone_count} Dead Zone(s) &bull; {s.total_measurements} Pts
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      className="btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSurvey(s);
                      }}
                      style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                    >
                      Open
                      <ArrowRight size={14} />
                    </button>

                    <button
                      className="btn-danger"
                      onClick={(e) => handleDelete(s.id, e)}
                      style={{ padding: "6px 10px" }}
                      title="Delete Survey"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
