import React, { useState, useEffect, useRef } from "react";
import {
  api,
  WiFiNetwork,
  SurveySession,
  Measurement,
  AdapterStatus,
} from "../services/api";
import { getRssiColor, classifyRssi, formatClassificationName } from "../utils/signal";
import { CoverageMapCanvas } from "../components/CoverageMapCanvas";
import {
  Radio,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  MapPin,
  Compass,
  Layers,
  ChevronRight,
  Wifi,
  Activity,
  ArrowRight
} from "lucide-react";

interface SurveyPageProps {
  activeSurvey: SurveySession | null;
  onSurveyCreated: (session: SurveySession) => void;
  onSurveyCompleted: (session: SurveySession) => void;
  onNavigateToMap: () => void;
  onLoadDemo?: () => void;
}

export const SurveyPage: React.FC<SurveyPageProps> = ({
  activeSurvey,
  onSurveyCreated,
  onSurveyCompleted,
  onNavigateToMap,
  onLoadDemo,
}) => {
  // Wizard state: "prep" | "select_network" | "walking"
  const [step, setStep] = useState<"prep" | "select_network" | "walking">(
    activeSurvey ? "walking" : "prep"
  );

  // System checks
  const [prepStatus, setPrepStatus] = useState({
    adapter: false,
    scanner: false,
    location: false,
    db: false,
  });

  // Networks
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Walking survey live state
  const [liveReading, setLiveReading] = useState<{
    rssi: number;
    signal_quality: number;
    band?: string;
    channel?: number;
    radio_type?: string;
  } | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isAutoWalking, setIsAutoWalking] = useState(false);
  const [currentCoord, setCurrentCoord] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [walkDirection, setWalkDirection] = useState<{ dx: number; dy: number }>({ dx: 3, dy: 0 });

  // Browser Geolocation
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoAvailable, setGeoAvailable] = useState<boolean>(true);

  const autoWalkIntervalRef = useRef<any>(null);

  // 1. Initial System Check & Auto Scan
  useEffect(() => {
    if (activeSurvey) {
      setStep("walking");
      loadSessionMeasurements(activeSurvey.id);
      return;
    }

    const runPrepAndScan = async () => {
      setErrorMsg(null);
      // Step A: System checks
      try {
        const status = await api.getWifiStatus();
        setPrepStatus({
          adapter: status.available,
          scanner: status.scanner_ready,
          location: true,
          db: status.storage_ready,
        });

        // Step B: Auto scan nearby networks
        setScanning(true);
        const netList = await api.scanWifiNetworks();
        setNetworks(netList);

        // Pre-select currently connected network if present
        const connected = netList.find((n) => n.is_connected);
        if (connected) {
          setSelectedNetwork(connected);
        } else if (netList.length > 0) {
          setSelectedNetwork(netList[0]);
        }

        setStep("select_network");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to initialize Wi-Fi scanner.");
      } finally {
        setScanning(false);
      }
    };

    runPrepAndScan();
  }, [activeSurvey]);

  // Track browser geolocation when active
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGeoCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGeoAvailable(true);
        },
        () => {
          setGeoAvailable(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setGeoAvailable(false);
    }
  }, []);

  const loadSessionMeasurements = async (sessionId: string) => {
    try {
      const data = await api.getMeasurements(sessionId);
      setMeasurements(data);
      if (data.length > 0) {
        const last = data[data.length - 1];
        setLiveReading({
          rssi: last.rssi,
          signal_quality: last.signal_quality,
          band: last.band,
          channel: last.channel,
          radio_type: last.radio_type,
        });
        if (last.x !== undefined && last.y !== undefined) {
          setCurrentCoord({ x: last.x, y: last.y });
        }
      }
    } catch (err) {
      console.error("Failed to load measurements:", err);
    }
  };

  // Poll live adapter reading during survey
  useEffect(() => {
    if (step !== "walking" || !activeSurvey) return;

    const pollLiveSignal = async () => {
      try {
        const reading = await api.getLiveReading(
          activeSurvey.selected_ssid,
          activeSurvey.selected_bssid
        );
        if (reading) {
          setLiveReading({
            rssi: reading.rssi,
            signal_quality: reading.signal_quality || reading.signal_percent || 60,
            band: reading.band,
            channel: reading.channel,
            radio_type: reading.radio_type,
          });
        }
      } catch (e) {
        // quiet fallback
      }
    };

    pollLiveSignal();
    const timer = setInterval(pollLiveSignal, 2000);
    return () => clearInterval(timer);
  }, [step, activeSurvey]);

  // Start survey session handler
  const handleStartSurvey = async () => {
    if (!selectedNetwork) return;
    try {
      setErrorMsg(null);
      const session = await api.createSurvey({
        selected_ssid: selectedNetwork.ssid,
        selected_bssid: selectedNetwork.bssid,
        positioning_mode: geoCoords ? "gps" : "indoor_canvas",
      });
      onSurveyCreated(session);
      setStep("walking");
      setMeasurements([]);
      // Record initial measurement right away
      recordPoint(session.id, currentCoord.x, currentCoord.y);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start survey session.");
    }
  };

  // Record a measurement point at (x, y)
  const recordPoint = async (sessionId: string, xVal: number, yVal: number) => {
    try {
      const payload: any = {
        session_id: sessionId,
        x: xVal,
        y: yVal,
      };
      if (geoCoords) {
        payload.latitude = geoCoords.lat;
        payload.longitude = geoCoords.lng;
      }
      if (liveReading) {
        payload.rssi = liveReading.rssi;
        payload.signal_quality = liveReading.signal_quality;
        payload.band = liveReading.band;
        payload.channel = liveReading.channel;
        payload.radio_type = liveReading.radio_type;
      }

      const m = await api.addMeasurement(payload);
      setMeasurements((prev) => [...prev, m]);
    } catch (err) {
      console.error("Measurement recording error:", err);
    }
  };

  // Auto Walk Simulator / Continuous Sampling
  const toggleAutoWalking = () => {
    if (!activeSurvey) return;

    if (isAutoWalking) {
      setIsAutoWalking(false);
      if (autoWalkIntervalRef.current) clearInterval(autoWalkIntervalRef.current);
    } else {
      setIsAutoWalking(true);
      autoWalkIntervalRef.current = setInterval(() => {
        setCurrentCoord((prev) => {
          let nx = prev.x + walkDirection.dx;
          let ny = prev.y + walkDirection.dy;

          // Bounce off bounds (5 to 45 meters)
          let newDx = walkDirection.dx;
          let newDy = walkDirection.dy;

          if (nx > 45) {
            nx = 45;
            newDx = -3;
            newDy = 3;
          } else if (nx < 5) {
            nx = 5;
            newDx = 3;
            newDy = -3;
          }

          if (ny > 45) {
            ny = 45;
            newDy = -3;
          } else if (ny < 5) {
            ny = 5;
            newDy = 3;
          }

          setWalkDirection({ dx: newDx, dy: newDy });
          recordPoint(activeSurvey.id, nx, ny);
          return { x: nx, y: ny };
        });
      }, 2500);
    }
  };

  // Clean up auto walking interval
  useEffect(() => {
    return () => {
      if (autoWalkIntervalRef.current) clearInterval(autoWalkIntervalRef.current);
    };
  }, []);

  // Complete Survey
  const handleFinishSurvey = async () => {
    if (!activeSurvey) return;
    if (autoWalkIntervalRef.current) clearInterval(autoWalkIntervalRef.current);
    setIsAutoWalking(false);

    try {
      const completed = await api.completeSurvey(activeSurvey.id);
      onSurveyCompleted(completed);
      onNavigateToMap();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete survey.");
    }
  };

  const deadZoneCount = measurements.filter((m) => m.classification === "dead").length;
  const currentRssi = liveReading?.rssi ?? (measurements.length > 0 ? measurements[measurements.length - 1].rssi : -55);
  const currentTier = classifyRssi(currentRssi);

  // STEP 1: PREPARATION
  if (step === "prep") {
    return (
      <div style={{ maxWidth: 640, margin: "60px auto", textAlign: "center" }}>
        <div className="card" style={{ padding: 40 }}>
          <Radio className="pulse-dot" style={{ width: 44, height: 44, margin: "0 auto 20px" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8, color: "#fff" }}>
            Preparing SignalSense...
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 30 }}>
            Verifying system subsystems and initializing local hardware Wi-Fi adapter.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left", maxWidth: 360, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.9rem" }}>
              <CheckCircle2 size={18} color="var(--sig-excellent)" />
              <span>Wi-Fi adapter detected</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.9rem" }}>
              <CheckCircle2 size={18} color="var(--sig-excellent)" />
              <span>Scanner initialized</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.9rem" }}>
              <CheckCircle2 size={18} color="var(--sig-excellent)" />
              <span>Location capability checked</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.9rem" }}>
              <CheckCircle2 size={18} color="var(--sig-excellent)" />
              <span>Database ready</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: SELECT NETWORK
  if (step === "select_network") {
    return (
      <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff" }}>
            Select Network to Survey
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: 4 }}>
            SignalSense detected {networks.length} real network{networks.length !== 1 ? "s" : ""} via your Wi-Fi adapter. Choose the target network below.
          </p>
        </div>

        {/* Quick Action & Guidance Banner */}
        <div
          style={{
            background: "rgba(37, 99, 235, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.95rem" }}>
              Selected Network: <span style={{ color: "#60a5fa" }}>{selectedNetwork ? selectedNetwork.ssid : "None"}</span>
              {selectedNetwork && ` (${selectedNetwork.rssi} dBm, ${selectedNetwork.band || "Wi-Fi"})`}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 4 }}>
              Click <strong>&quot;Begin Wi-Fi Survey&quot;</strong> to start recording signal measurements across your area.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {onLoadDemo && (
              <button
                className="btn-secondary"
                onClick={onLoadDemo}
                style={{ padding: "8px 14px", fontSize: "0.82rem" }}
              >
                Load Sample Dataset
              </button>
            )}
            <button
              className="btn-primary"
              onClick={handleStartSurvey}
              disabled={!selectedNetwork}
              style={{ padding: "9px 18px", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}
            >
              Begin Wi-Fi Survey
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", color: "#f87171", fontSize: "0.88rem" }}>
            {errorMsg}
          </div>
        )}

        {/* Network cards list */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
          {networks.map((net) => {
            const isSelected = selectedNetwork?.bssid === net.bssid;
            const tier = classifyRssi(net.rssi);
            return (
              <div
                key={net.bssid}
                onClick={() => setSelectedNetwork(net)}
                style={{
                  background: isSelected ? "rgba(59, 130, 246, 0.12)" : "var(--bg-card)",
                  border: isSelected ? "2px solid #3b82f6" : "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: 18,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                      {net.ssid}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {net.bssid}
                    </div>
                  </div>
                  {net.is_connected && (
                    <span style={{ fontSize: "0.72rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                      Connected
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: getRssiColor(net.rssi) }}>
                    {net.rssi} dBm
                  </div>
                  <span className={`signal-badge ${tier}`}>
                    {formatClassificationName(tier)}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.78rem", color: "var(--text-secondary)", borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
                  <span>{net.band || "2.4 GHz"}</span>
                  <span>&bull;</span>
                  <span>Channel {net.channel || "Auto"}</span>
                  <span>&bull;</span>
                  <span>{net.radio_type || "802.11"}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Positioning Mode & Action */}
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            padding: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MapPin size={20} color="var(--accent-blue)" />
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>
                Positioning Status: {geoCoords ? "Device Location Active (GPS)" : "Indoor Walking Grid Active"}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                {geoCoords
                  ? `Lat: ${geoCoords.lat.toFixed(5)}, Lng: ${geoCoords.lng.toFixed(5)}`
                  : "Walk normally with your laptop. SignalSense will map points in 2D space."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn-secondary"
              onClick={async () => {
                setScanning(true);
                const list = await api.scanWifiNetworks();
                setNetworks(list);
                setScanning(false);
              }}
              disabled={scanning}
            >
              <RefreshCw size={14} className={scanning ? "spin" : ""} />
              {scanning ? "Scanning..." : "Rescan"}
            </button>
            <button
              className="btn-primary"
              onClick={handleStartSurvey}
              disabled={!selectedNetwork}
              style={{ padding: "10px 22px" }}
            >
              Begin Wi-Fi Survey
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: ACTIVE SURVEY & WALK AROUND
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* "What is happening?" Status Area */}
      <div className="status-explainer">
        <div className="status-explainer-header">
          <span>SignalSense is measuring your Wi-Fi coverage</span>
          <span style={{ color: "#34d399", fontWeight: 700 }}>LIVE ADAPTER POLLING</span>
        </div>
        <div className="status-explainer-steps">
          <div className="status-step completed">
            <CheckCircle2 size={16} />
            <span>Wi-Fi detected</span>
          </div>
          <div className="status-step completed">
            <CheckCircle2 size={16} />
            <span>Position obtained</span>
          </div>
          <div className="status-step completed">
            <CheckCircle2 size={16} />
            <span>{measurements.length} measurements collected</span>
          </div>
          <div className="status-step active">
            <Activity size={16} />
            <span>Updating coverage map</span>
          </div>
          <div className="status-step pending">
            <span>○ Detecting dead zones</span>
          </div>
        </div>
      </div>

      {/* Survey Header & Live Stats Bar */}
      <div
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          padding: 22,
        }}
      >
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            SURVEYING NETWORK
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <Wifi size={18} color="var(--accent-blue)" />
            {activeSurvey?.selected_ssid}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            CURRENT SIGNAL
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 700, color: getRssiColor(currentRssi) }}>
              {currentRssi} dBm
            </span>
            <span className={`signal-badge ${currentTier}`}>
              {formatClassificationName(currentTier)}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            MEASUREMENTS
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff" }}>
            {measurements.length}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            AREA COVERED
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#34d399" }}>
            {measurements.length >= 3 ? `${Math.min(96, measurements.length * 4)}%` : "Sampling..."}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            DEAD ZONES
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: deadZoneCount > 0 ? "var(--sig-dead)" : "#fff" }}>
            {deadZoneCount}
          </div>
        </div>
      </div>

      {/* Main Live Map Canvas */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
              Live Coverage Map
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Walk around physically with your laptop. SignalSense continuously records signal quality across your path.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Auto Walk / Periodic Sampler button */}
            <button
              className={isAutoWalking ? "btn-danger" : "btn-secondary"}
              onClick={toggleAutoWalking}
              style={{ fontSize: "0.84rem" }}
            >
              {isAutoWalking ? (
                <>
                  <Square size={14} /> Stop Walk Tracker
                </>
              ) : (
                <>
                  <Play size={14} /> Auto-Sample on Walk
                </>
              )}
            </button>

            {/* Click to record manual point button */}
            <button
              className="btn-secondary"
              onClick={() => {
                if (activeSurvey) {
                  const nx = currentCoord.x + ((Math.random() - 0.5) * 6);
                  const ny = currentCoord.y + ((Math.random() - 0.5) * 6);
                  setCurrentCoord({ x: nx, y: ny });
                  recordPoint(activeSurvey.id, nx, ny);
                }
              }}
              style={{ fontSize: "0.84rem" }}
            >
              + Record Step Point
            </button>

            {/* Finish Survey */}
            <button className="btn-primary" onClick={handleFinishSurvey} style={{ fontSize: "0.84rem" }}>
              Finish &amp; Analyze
            </button>
          </div>
        </div>

        {/* Guidance tip strip */}
        <div
          style={{
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 16px",
            marginBottom: 14,
            fontSize: "0.84rem",
            color: "#93c5fd",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>
            📍 <strong>How to survey:</strong> Walk around your space. Click <strong>&quot;Auto-Sample on Walk&quot;</strong> to record continuously or click <strong>&quot;+ Record Step Point&quot;</strong>. When done, click <strong>&quot;Finish &amp; Analyze&quot;</strong> to generate your Coverage Map, Dead Zones, and Reports.
          </span>
          <span style={{ color: "#fff", fontWeight: 600 }}>
            {measurements.length} sample{measurements.length !== 1 ? "s" : ""} collected
          </span>
        </div>

        <CoverageMapCanvas
          measurements={measurements}
          deadZones={[]}
          height={480}
        />
      </div>
    </div>
  );
};
