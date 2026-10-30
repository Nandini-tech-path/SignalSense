import React, { useState, useEffect } from "react";
import { SurveySession, api } from "./services/api";
import { OverviewPage } from "./pages/OverviewPage";
import { SurveyPage } from "./pages/SurveyPage";
import { CoverageMapPage } from "./pages/CoverageMapPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { DeadZonesPage } from "./pages/DeadZonesPage";
import { NetworksPage } from "./pages/NetworksPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import {
  Radio,
  Compass,
  Map,
  TrendingUp,
  AlertTriangle,
  Wifi,
  History,
  FileText,
  Settings,
  Plus,
} from "lucide-react";

export type NavTab =
  | "overview"
  | "survey"
  | "coverage_map"
  | "analysis"
  | "dead_zones"
  | "networks"
  | "history"
  | "reports"
  | "settings";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [currentSurvey, setCurrentSurvey] = useState<SurveySession | null>(null);
  const [surveysList, setSurveysList] = useState<SurveySession[]>([]);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  const refreshSurveys = async (selectNewest = false) => {
    try {
      const list = await api.listSurveys();
      setSurveysList(list);
      if (list.length > 0) {
        if (selectNewest) {
          setCurrentSurvey(list[0]);
        } else {
          setCurrentSurvey((prev) => {
            if (prev) {
              const updated = list.find((s) => s.id === prev.id);
              return updated || prev;
            }
            const inProgress = list.find((s) => s.status === "in_progress");
            return inProgress || list[0];
          });
        }
      }
      return list;
    } catch (e) {
      // quiet fallback
      return [];
    }
  };

  // Check if any recent survey exists to set as initial context
  useEffect(() => {
    refreshSurveys(true);
  }, []);

  const handleStartNewSurvey = () => {
    setCurrentSurvey(null);
    setActiveTab("survey");
  };

  const handleSurveyCreated = (session: SurveySession) => {
    setCurrentSurvey(session);
    setActiveTab("survey");
    refreshSurveys();
  };

  const handleSurveyCompleted = (session: SurveySession) => {
    setCurrentSurvey(session);
    setActiveTab("coverage_map");
    refreshSurveys();
  };

  const handleOpenSurvey = (session: SurveySession) => {
    setCurrentSurvey(session);
    setActiveTab("coverage_map");
  };

  const handleSelectSurveyById = (id: string) => {
    const found = surveysList.find((s) => s.id === id);
    if (found) {
      setCurrentSurvey(found);
      if (activeTab === "overview" || activeTab === "survey") {
        setActiveTab("coverage_map");
      }
    }
  };

  const handleGenerateDemo = async () => {
    try {
      setIsGeneratingDemo(true);
      const demo = await api.generateDemoSurvey();
      await refreshSurveys(true);
      setCurrentSurvey(demo);
      setActiveTab("coverage_map");
    } catch (err) {
      console.error("Failed to generate demo dataset:", err);
      alert("Failed to generate demo dataset. Please check backend connection.");
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleViewDeadZoneOnMap = (deadZone: any) => {
    setActiveTab("coverage_map");
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Radio size={20} />
          </div>
          <div>
            <div className="brand-title">SignalSense</div>
            <div className="brand-subtitle">RF Propagation &bull; PBL</div>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Radio size={18} />
            <span>Overview</span>
          </button>

          <button
            className={`nav-item ${activeTab === "survey" ? "active" : ""}`}
            onClick={() => setActiveTab("survey")}
          >
            <Compass size={18} />
            <span>Survey</span>
          </button>

          <button
            className={`nav-item ${activeTab === "coverage_map" ? "active" : ""}`}
            onClick={() => setActiveTab("coverage_map")}
          >
            <Map size={18} />
            <span>Coverage Map</span>
          </button>

          <button
            className={`nav-item ${activeTab === "analysis" ? "active" : ""}`}
            onClick={() => setActiveTab("analysis")}
          >
            <TrendingUp size={18} />
            <span>Analysis</span>
          </button>

          <button
            className={`nav-item ${activeTab === "dead_zones" ? "active" : ""}`}
            onClick={() => setActiveTab("dead_zones")}
          >
            <AlertTriangle size={18} />
            <span>Dead Zones</span>
          </button>

          <button
            className={`nav-item ${activeTab === "networks" ? "active" : ""}`}
            onClick={() => setActiveTab("networks")}
          >
            <Wifi size={18} />
            <span>Networks</span>
          </button>

          <button
            className={`nav-item ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <History size={18} />
            <span>History</span>
          </button>

          <button
            className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            <FileText size={18} />
            <span>Reports</span>
          </button>

          <button
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div>Computer Networks PBL</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: 2 }}>
            Real-world 802.11 Wi-Fi Engine
          </div>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="top-bar no-print">
          <div className="top-bar-left">
            {surveysList.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Active Survey:
                </span>
                <select
                  value={currentSurvey?.id || ""}
                  onChange={(e) => handleSelectSurveyById(e.target.value)}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "#fff",
                    padding: "6px 12px",
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    maxWidth: 280,
                  }}
                >
                  <option value="" disabled>-- Select Survey --</option>
                  {surveysList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.selected_ssid})
                    </option>
                  ))}
                </select>
                {currentSurvey && (
                  <span className="active-survey-pill">
                    <span className="pulse-dot" />
                    <span>{currentSurvey.selected_ssid}</span>
                  </span>
                )}
              </div>
            ) : currentSurvey ? (
              <div className="active-survey-pill">
                <span className="pulse-dot" />
                <span>
                  {currentSurvey.status === "in_progress" ? "Surveying:" : "Survey:"}{" "}
                  <strong>{currentSurvey.selected_ssid}</strong>
                </span>
              </div>
            ) : (
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                No active survey &bull; Ready to survey
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn-secondary"
              onClick={handleGenerateDemo}
              disabled={isGeneratingDemo}
              style={{ padding: "7px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}
              title="Generate sample dataset to test coverage map, IDW interpolation, and dead zones"
            >
              <Radio size={14} />
              {isGeneratingDemo ? "Generating..." : "Load Demo Dataset"}
            </button>

            <button
              className="btn-primary"
              onClick={handleStartNewSurvey}
              style={{ padding: "7px 14px", fontSize: "0.84rem" }}
            >
              <Plus size={15} />
              Start Survey
            </button>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <div className="page-view-container">
          {activeTab === "overview" && (
            <OverviewPage
              onStartSurvey={handleStartNewSurvey}
              onOpenSurvey={handleOpenSurvey}
            />
          )}

          {activeTab === "survey" && (
            <SurveyPage
              activeSurvey={currentSurvey}
              onSurveyCreated={handleSurveyCreated}
              onSurveyCompleted={handleSurveyCompleted}
              onNavigateToMap={() => setActiveTab("coverage_map")}
              onLoadDemo={handleGenerateDemo}
            />
          )}

          {activeTab === "coverage_map" && (
            <CoverageMapPage
              currentSurvey={currentSurvey}
              surveys={surveysList}
              onSelectSurvey={(s) => setCurrentSurvey(s)}
              onNavigateToAnalysis={() => setActiveTab("analysis")}
              onNavigateToDeadZones={() => setActiveTab("dead_zones")}
              onStartSurvey={handleStartNewSurvey}
              onLoadDemo={handleGenerateDemo}
            />
          )}

          {activeTab === "analysis" && (
            <AnalysisPage
              currentSurvey={currentSurvey}
              surveys={surveysList}
              onSelectSurvey={(s) => setCurrentSurvey(s)}
              onNavigateToDeadZones={() => setActiveTab("dead_zones")}
              onNavigateToMap={() => setActiveTab("coverage_map")}
              onNavigateToReport={() => setActiveTab("reports")}
              onStartSurvey={handleStartNewSurvey}
              onLoadDemo={handleGenerateDemo}
            />
          )}

          {activeTab === "dead_zones" && (
            <DeadZonesPage
              currentSurvey={currentSurvey}
              surveys={surveysList}
              onSelectSurvey={(s) => setCurrentSurvey(s)}
              onViewOnMap={handleViewDeadZoneOnMap}
              onStartSurvey={handleStartNewSurvey}
              onLoadDemo={handleGenerateDemo}
            />
          )}

          {activeTab === "networks" && <NetworksPage />}

          {activeTab === "history" && (
            <HistoryPage
              onOpenSurvey={handleOpenSurvey}
              onStartSurvey={handleStartNewSurvey}
              onLoadDemo={handleGenerateDemo}
            />
          )}

          {activeTab === "reports" && (
            <ReportsPage
              currentSurvey={currentSurvey}
              surveys={surveysList}
              onSelectSurvey={(s) => setCurrentSurvey(s)}
              onStartSurvey={handleStartNewSurvey}
              onLoadDemo={handleGenerateDemo}
            />
          )}

          {activeTab === "settings" && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
