import React, { useEffect, useState } from "react";
import { api, AppSettings } from "../services/api";
import { Settings, Save, Database, Trash2, CheckCircle2, ShieldAlert } from "lucide-react";

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    excellent_threshold: -50,
    good_threshold: -60,
    fair_threshold: -70,
    weak_threshold: -80,
    dead_threshold: -80,
    scan_interval_seconds: 2,
    positioning_mode_default: "auto",
  });
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [demoStatus, setDemoStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDemo = async () => {
    setDemoStatus("Generating isolated demo survey dataset...");
    try {
      await api.generateDemoSurvey();
      setDemoStatus("Demo survey generated successfully. Visit History or Coverage Map to view.");
      setTimeout(() => setDemoStatus(null), 4000);
    } catch (err: any) {
      setDemoStatus(err.message || "Failed to generate demo dataset.");
    }
  };

  const handleClearDemo = async () => {
    try {
      await api.clearDemoSurveys();
      setDemoStatus("Demo datasets cleared.");
      setTimeout(() => setDemoStatus(null), 4000);
    } catch (err: any) {
      setDemoStatus(err.message || "Failed to clear demo surveys.");
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff" }}>
          Application Settings &amp; Thresholds
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: 4 }}>
          Fine-tune RF thresholds and measurement parameters according to your networking environment.
        </p>
      </div>

      {/* Threshold Configuration Form */}
      <form onSubmit={handleSave} className="card" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 20 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
          Signal Classification Thresholds (dBm)
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Excellent Threshold (&ge; dBm)
            </label>
            <input
              type="number"
              value={settings.excellent_threshold}
              onChange={(e) => setSettings({ ...settings, excellent_threshold: Number(e.target.value) })}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                color: "#fff",
              }}
            />
            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Default: -50 dBm</span>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Good Threshold (&ge; dBm)
            </label>
            <input
              type="number"
              value={settings.good_threshold}
              onChange={(e) => setSettings({ ...settings, good_threshold: Number(e.target.value) })}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                color: "#fff",
              }}
            />
            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Default: -60 dBm</span>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Fair Threshold (&ge; dBm)
            </label>
            <input
              type="number"
              value={settings.fair_threshold}
              onChange={(e) => setSettings({ ...settings, fair_threshold: Number(e.target.value) })}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                color: "#fff",
              }}
            />
            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Default: -70 dBm</span>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Weak / Dead Zone Threshold (&lt; dBm)
            </label>
            <input
              type="number"
              value={settings.dead_threshold}
              onChange={(e) => setSettings({ ...settings, dead_threshold: Number(e.target.value) })}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                color: "#fff",
              }}
            />
            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Default: -80 dBm</span>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 18 }}>
          <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
            Hardware Polling Interval (seconds)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.scan_interval_seconds}
            onChange={(e) => setSettings({ ...settings, scan_interval_seconds: Number(e.target.value) })}
            style={{
              width: 140,
              padding: "8px 12px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              color: "#fff",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Save size={15} />
            Save Configuration
          </button>
          {savedSuccess && (
            <span style={{ color: "var(--sig-excellent)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={16} /> Configuration saved.
            </span>
          )}
        </div>
      </form>

      {/* Demo / Testing Mode Panel (Section 22) */}
      <div className="card" style={{ padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Database size={18} color="#60a5fa" />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
            Presentation &amp; Test Mode
          </h2>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 18 }}>
          Demo data is <strong>strictly isolated</strong> and flagged with <code>is_demo=True</code>. It is provided for presentation evaluations and never automatically mixes with your real survey measurements.
        </p>

        {demoStatus && (
          <div style={{ padding: "10px 14px", background: "rgba(59, 130, 246, 0.15)", borderRadius: 6, color: "#93c5fd", fontSize: "0.85rem", marginBottom: 14 }}>
            {demoStatus}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-secondary" onClick={handleGenerateDemo} style={{ fontSize: "0.85rem" }}>
            Generate Isolated Demo Dataset
          </button>
          <button className="btn-danger" onClick={handleClearDemo} style={{ fontSize: "0.85rem" }}>
            <Trash2 size={14} /> Clear Demo Surveys
          </button>
        </div>
      </div>
    </div>
  );
};
