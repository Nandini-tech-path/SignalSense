import React, { useEffect, useState } from "react";
import { api, WiFiNetwork } from "../services/api";
import { formatClassificationName, getRssiColor, classifyRssi } from "../utils/signal";
import { Radio, RefreshCw, Wifi, Activity, ShieldCheck, Layers, Hash } from "lucide-react";

export const NetworksPage: React.FC = () => {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);

  const fetchNetworks = async () => {
    setScanning(true);
    try {
      const data = await api.scanWifiNetworks();
      setNetworks(data);
      if (data.length > 0 && !selectedNetwork) {
        setSelectedNetwork(data[0]);
      }
    } catch (err) {
      console.error("Failed to scan networks:", err);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  // Compute channel and band distributions
  const bandCounts: Record<string, number> = {};
  const channelCounts: Record<string, number> = {};

  networks.forEach((n) => {
    const band = n.band || "2.4 GHz";
    bandCounts[band] = (bandCounts[band] || 0) + 1;

    if (n.channel) {
      channelCounts[`Ch ${n.channel}`] = (channelCounts[`Ch ${n.channel}`] || 0) + 1;
    }
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff" }}>
            Network Analysis &amp; RF Environment
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: 4 }}>
            Direct physical observations of visible 802.11 beacons and access points in range.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={fetchNetworks}
          disabled={scanning}
          style={{ padding: "9px 18px" }}
        >
          <RefreshCw size={15} className={scanning ? "spin" : ""} />
          {scanning ? "Scanning Wi-Fi..." : "Scan Environment"}
        </button>
      </div>

      {/* Summary Statistics Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            Visible SSIDs
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff" }}>
            {networks.length}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            2.4 GHz Networks
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#60a5fa" }}>
            {bandCounts["2.4 GHz"] || 0}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            5 GHz Networks
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#34d399" }}>
            {bandCounts["5 GHz"] || 0}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            Active Channels
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fbbf24" }}>
            {Object.keys(channelCounts).length}
          </div>
        </div>
      </div>

      {/* Networks Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", fontWeight: 600, fontSize: "0.95rem" }}>
          Nearby Access Points &amp; Signal Metrics
        </div>

        {networks.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <Radio className="empty-state-icon" />
            <h3 className="empty-state-title">No Networks Detected</h3>
            <p className="empty-state-desc">
              Click &quot;Scan Environment&quot; to probe for visible Wi-Fi access points.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "12px 18px", fontWeight: 600 }}>SSID</th>
                  <th style={{ padding: "12px 18px", fontWeight: 600 }}>BSSID (MAC)</th>
                  <th style={{ padding: "12px 18px", fontWeight: 600 }}>Signal (RSSI)</th>
                  <th style={{ padding: "12px 18px", fontWeight: 600 }}>Quality</th>
                  <th style={{ padding: "12px 18px", fontWeight: 600 }}>Band</th>
                  <th style={{ padding: "12px 18px", fontWeight: 600 }}>Channel</th>
                  <th style={{ padding: "12px 18px", fontWeight: 600 }}>Protocol</th>
                  <th style={{ padding: "12px 18px", fontWeight: 600 }}>Security</th>
                </tr>
              </thead>
              <tbody>
                {networks.map((n) => {
                  const tier = classifyRssi(n.rssi);
                  return (
                    <tr
                      key={n.bssid}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-tertiary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ padding: "14px 18px", fontWeight: 600, color: "#fff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Wifi size={15} color="var(--accent-blue)" />
                          {n.ssid}
                          {n.is_connected && (
                            <span style={{ fontSize: "0.7rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "1px 6px", borderRadius: 4 }}>
                              Connected
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px", color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "0.82rem" }}>
                        {n.bssid}
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 700, color: getRssiColor(n.rssi) }}>
                        {n.rssi} dBm
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span className={`signal-badge ${tier}`}>
                          {n.signal_quality}%
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                        {n.band || "2.4 GHz"}
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 600 }}>
                        {n.channel || "—"}
                      </td>
                      <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                        {n.radio_type || "802.11"}
                      </td>
                      <td style={{ padding: "14px 18px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {n.authentication || "Open"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
