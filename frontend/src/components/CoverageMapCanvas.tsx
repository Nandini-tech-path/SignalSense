import React, { useRef, useEffect, useState } from "react";
import { Measurement, DeadZone, HeatmapCell } from "../services/api";
import { getRssiColor, classifyRssi, formatClassificationName } from "../utils/signal";
import { Layers, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Eye, EyeOff } from "lucide-react";

interface CoverageMapCanvasProps {
  measurements: Measurement[];
  deadZones?: DeadZone[];
  heatmapCells?: HeatmapCell[];
  selectedPointId?: number | null;
  onSelectPoint?: (m: Measurement | null) => void;
  width?: number;
  height?: number;
}

export const CoverageMapCanvas: React.FC<CoverageMapCanvasProps> = ({
  measurements,
  deadZones = [],
  heatmapCells = [],
  selectedPointId,
  onSelectPoint,
  width = 800,
  height = 520,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Toggles
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showDeadZones, setShowDeadZones] = useState(true);
  const [showWeakZones, setShowWeakZones] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<Measurement | null>(null);

  // Determine coordinate bounding box
  const getBounds = () => {
    if (measurements.length === 0) {
      return { minX: 0, maxX: 50, minY: 0, maxY: 50 };
    }

    const xs = measurements.map((m) => m.x ?? (m.longitude ? (m.longitude % 1) * 10000 : 0));
    const ys = measurements.map((m) => m.y ?? (m.latitude ? (m.latitude % 1) * 10000 : 0));

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const spanX = Math.max(maxX - minX, 10);
    const spanY = Math.max(maxY - minY, 10);

    return {
      minX: minX - spanX * 0.15,
      maxX: maxX + spanX * 0.15,
      minY: minY - spanY * 0.15,
      maxY: maxY + spanY * 0.15,
    };
  };

  const toCanvasCoords = (x: number, y: number, bounds: ReturnType<typeof getBounds>) => {
    const normX = (x - bounds.minX) / (bounds.maxX - bounds.minX || 1);
    const normY = (y - bounds.minY) / (bounds.maxY - bounds.minY || 1);

    const padding = 50;
    const drawW = (width - padding * 2) * zoom;
    const drawH = (height - padding * 2) * zoom;

    const cx = padding + normX * drawW + pan.x;
    const cy = height - (padding + normY * drawH) + pan.y; // invert Y for standard Cartesian

    return { cx, cy };
  };

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw subtle engineering blueprint grid
    ctx.strokeStyle = "rgba(36, 48, 73, 0.5)";
    ctx.lineWidth = 1;
    const gridSize = 40 * zoom;
    const offsetX = (pan.x % gridSize + gridSize) % gridSize;
    const offsetY = (pan.y % gridSize + gridSize) % gridSize;

    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const bounds = getBounds();

    // 2. Render IDW Heatmap Surface
    if (showHeatmap && heatmapCells.length > 0) {
      // Draw smooth interpolated cells
      const cellRadius = Math.max(18 * zoom, 12);
      heatmapCells.forEach((cell) => {
        const { cx, cy } = toCanvasCoords(cell.x, cell.y, bounds);
        const color = getRssiColor(cell.rssi);

        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, cellRadius);
        grad.addColorStop(0, color + "66"); // 40% opacity
        grad.addColorStop(0.7, color + "22"); // 13% opacity
        grad.addColorStop(1, "transparent");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, cellRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 3. Render Walking Path line connecting points in chronological order
    if (measurements.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;

      measurements.forEach((m, idx) => {
        const x = m.x ?? (m.longitude ? (m.longitude % 1) * 10000 : 0);
        const y = m.y ?? (m.latitude ? (m.latitude % 1) * 10000 : 0);
        const { cx, cy } = toCanvasCoords(x, y, bounds);

        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.setLineDash([]); // reset dash
    }

    // 4. Render Measurement Points
    if (showPoints) {
      measurements.forEach((m) => {
        const tier = m.classification || classifyRssi(m.rssi);
        if (tier === "weak" && !showWeakZones) return;

        const x = m.x ?? (m.longitude ? (m.longitude % 1) * 10000 : 0);
        const y = m.y ?? (m.latitude ? (m.latitude % 1) * 10000 : 0);
        const { cx, cy } = toCanvasCoords(x, y, bounds);

        const isSelected = selectedPointId === m.id;
        const isHovered = hoveredPoint?.id === m.id;
        const color = getRssiColor(m.rssi);

        // Halo / pulse if selected or hovered
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fillStyle = color + "44";
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Point circle
        ctx.beginPath();
        ctx.arc(cx, cy, isSelected ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // 5. Render Dead Zones with distinct danger ring
    if (showDeadZones && deadZones.length > 0) {
      deadZones.forEach((dz) => {
        const x = dz.x ?? (dz.longitude ? (dz.longitude % 1) * 10000 : 0);
        const y = dz.y ?? (dz.latitude ? (dz.latitude % 1) * 10000 : 0);
        const { cx, cy } = toCanvasCoords(x, y, bounds);

        // Warning pulsing ring
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
        ctx.fill();

        // Core marker
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  }, [
    measurements,
    deadZones,
    heatmapCells,
    showHeatmap,
    showPoints,
    showDeadZones,
    showWeakZones,
    zoom,
    pan,
    selectedPointId,
    hoveredPoint,
    width,
    height,
  ]);

  // Mouse interaction: Hover, Click, Pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Check hit test for hover tooltip
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const bounds = getBounds();
    let hit: Measurement | null = null;

    for (const m of measurements) {
      const x = m.x ?? (m.longitude ? (m.longitude % 1) * 10000 : 0);
      const y = m.y ?? (m.latitude ? (m.latitude % 1) * 10000 : 0);
      const { cx, cy } = toCanvasCoords(x, y, bounds);

      const dist = Math.hypot(mouseX - cx, mouseY - cy);
      if (dist <= 12) {
        hit = m;
        break;
      }
    }

    setHoveredPoint(hit);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredPoint) {
      onSelectPoint?.(hoveredPoint);
    } else {
      onSelectPoint?.(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Map Control Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 16px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              style={{ accentColor: "var(--accent-blue)" }}
            />
            Heatmap Surface
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
              style={{ accentColor: "var(--accent-blue)" }}
            />
            Measurement Points ({measurements.length})
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showDeadZones}
              onChange={(e) => setShowDeadZones(e.target.checked)}
              style={{ accentColor: "var(--sig-dead)" }}
            />
            Dead Zones ({deadZones.length})
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showWeakZones}
              onChange={(e) => setShowWeakZones(e.target.checked)}
              style={{ accentColor: "var(--sig-weak)" }}
            />
            Weak Zones
          </label>
        </div>

        {/* Zoom & Reset Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            className="btn-secondary"
            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            className="btn-secondary"
            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height,
          background: "#0c1322",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        {/* Hover Inspector Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              background: "rgba(17, 24, 39, 0.95)",
              border: "1px solid var(--border-color)",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.82rem",
              backdropFilter: "blur(6px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: getRssiColor(hoveredPoint.rssi),
                }}
              />
              <strong>Point #{hoveredPoint.id}</strong>
              <span style={{ color: "var(--text-secondary)" }}>
                {formatClassificationName(hoveredPoint.classification)}
              </span>
            </div>
            <div style={{ color: "var(--text-secondary)", display: "flex", gap: 12 }}>
              <span>RSSI: <strong style={{ color: "#fff" }}>{hoveredPoint.rssi} dBm</strong></span>
              <span>Quality: <strong style={{ color: "#fff" }}>{hoveredPoint.signal_quality}%</strong></span>
              {hoveredPoint.band && <span>Band: <strong style={{ color: "#fff" }}>{hoveredPoint.band}</strong></span>}
              {hoveredPoint.channel && <span>Ch: <strong style={{ color: "#fff" }}>{hoveredPoint.channel}</strong></span>}
            </div>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "rgba(15, 23, 42, 0.88)",
            border: "1px solid var(--border-color)",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.76rem",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            backdropFilter: "blur(6px)",
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.03em" }}>
            SIGNAL TIERS
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981" }} />
            <span>Excellent (&ge; -50 dBm)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#14b8a6" }} />
            <span>Good (-50 to -60 dBm)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} />
            <span>Fair (-60 to -70 dBm)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f97316" }} />
            <span>Weak (-70 to -80 dBm)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444" }} />
            <span>Dead Zone (&lt; -80 dBm)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
