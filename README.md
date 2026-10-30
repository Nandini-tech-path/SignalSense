# SignalSense — Wi-Fi Dead Zone Detection and Mapping

> **Computer Networks PBL Project**  
> An intelligent, portable, and location-agnostic networking application that automatically observes the Wi-Fi environment, measures real physical signal strength as the user moves, maps the measurements using spatial interpolation, detects dead zones, and provides evidence-based network engineering recommendations.

---

## 1. Key Principles & Philosophy

- **Zero Manual Ingestion:** SignalSense does not require manual entry of SSIDs, BSSIDs, RSSI dBm values, or coordinates. Everything technically accessible through the hardware Wi-Fi adapter and system positioning is detected automatically.
- **Location-Agnostic & Portable:** No hardcoded environments or locations. Works at home, university laboratories, libraries, offices, cafes, or outdoor venues.
- **Real Physical RF Measurements:** Directly interacts with the laptop's Wi-Fi adapter via Windows Native Wi-Fi stack (`wlanapi.dll` and `netsh wlan`).
- **Explainable RF Physics:** Incorporates Inverse Distance Weighting (IDW) spatial interpolation, Free-Space Path Loss (FSPL) modeling, dual-band (2.4 GHz vs 5 GHz) material penetration analysis, and co-channel interference diagnostics.

---

## 2. System Architecture

```text
SignalSense/
├── frontend/                     # React 19 + TypeScript + Vite + Canvas / Leaflet
│   ├── src/
│   │   ├── components/           # CoverageMapCanvas, CoverageMapLeaflet
│   │   ├── pages/                # Overview, Survey, CoverageMap, Analysis, DeadZones, Networks, History, Reports, Settings
│   │   ├── services/api.ts       # Typed REST client
│   │   ├── utils/signal.ts       # RF thresholds and semantic classification
│   │   ├── App.tsx               # Connected router and state container
│   │   └── index.css             # Tailored networking design system
├── backend/                      # Python 3.12 + FastAPI + SQLite
│   ├── api/                      # REST endpoints for Wi-Fi, surveys, measurements, coverage, analysis, demo
│   ├── scanner/                  # Windows Wi-Fi hardware adapter scanner (wlanapi & netsh)
│   ├── database/                 # SQLAlchemy session and SQLite connection
│   ├── models/                   # SurveySession, Measurement, DeadZoneRecord, AppSettings
│   ├── schemas/                  # Pydantic request/response schemas
│   ├── services/                 # Spatial interpolation (IDW), recommendations engine, survey comparison
│   └── main.py                   # FastAPI lifespan application entrypoint
├── data/                         # Local SQLite persistence (signalsense.db)
├── tests/                        # Automated unit & integration tests
└── README.md
```

---

## 3. Mathematical & RF Foundations

### Inverse Distance Weighting (IDW) Interpolation
To map signal strength continuously across a 2D floor surface from discrete walking measurements:
For any arbitrary coordinate $p = (x, y)$, the interpolated RSSI value $R(p)$ is computed as:

$$R(p) = \frac{\sum_{i=1}^{N} w_i \cdot RSSI_i}{\sum_{i=1}^{N} w_i}$$

Where the spatial weight $w_i$ is determined by the Euclidean distance $d(p, p_i)$:

$$w_i = \frac{1}{d(p, p_i)^2}$$

*Note: Interpolation influence is bounded by a maximum empirical radius so coverage is never artificially manufactured into unmeasured voids.*

### Standard Signal Classification Thresholds
- **$\ge -50\text{ dBm}$ (Excellent):** Optimal line-of-sight signal, maximum data rates.
- **$-50\text{ to } -60\text{ dBm}$ (Good):** Reliable multi-stream video and heavy traffic.
- **$-60\text{ to } -70\text{ dBm}$ (Fair):** Normal web browsing and acceptable VoIP.
- **$-70\text{ to } -80\text{ dBm}$ (Weak):** High retransmissions, latency degradation, edge of coverage.
- **$< -80\text{ dBm}$ (Dead Zone):** Critical packet loss ($>25\%$), connection drops, and TCP disconnects.

---

## 4. Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Windows 10 / 11 with an operational Wi-Fi adapter

### Backend Setup
```bash
# Install backend dependencies
pip install -r requirements.txt

# Start FastAPI server (runs at http://127.0.0.1:8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies (already prepared)
npm install

# Start Vite dev server (runs at http://127.0.0.1:5173)
npm run dev
```

### Running Tests
```bash
python -m unittest tests/test_signalsense.py
```

---

## 5. User Workflow

1. **Overview:** Inspect system readiness (Wi-Fi Adapter, Scanner, Storage, Location Services).
2. **Start Wi-Fi Survey:** Automatically scans nearby networks without manual SSID input.
3. **Select Network:** Choose the target network from detected cards.
4. **Survey / Walk Around:** Move naturally with the laptop. SignalSense periodically samples hardware RSSI and maps points in real-time.
5. **Coverage Map:** Inspect the live Inverse Distance Weighting (IDW) heatmap, toggle measurement points, and view dead zone clusters.
6. **Analysis:** Review overall coverage percentage, signal tier distributions, and 2.4 GHz vs 5 GHz propagation metrics.
7. **Dead Zones:** Review isolated dead zones with severity tags and jump directly to their location on the map.
8. **Recommendations:** Access evidence-based computer networks guidance (router elevation, channel overlap adjustments, mesh positioning).
9. **History & Compare:** Compare two surveys (e.g. before vs after moving the router) to quantify coverage improvements.
10. **Report:** Generate and print/export a formal audit report as PDF.
