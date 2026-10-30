import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Measurement, DeadZone } from "../services/api";
import { getRssiColor, formatClassificationName } from "../utils/signal";

interface CoverageMapLeafletProps {
  measurements: Measurement[];
  deadZones?: DeadZone[];
  height?: number;
}

export const CoverageMapLeaflet: React.FC<CoverageMapLeafletProps> = ({
  measurements,
  deadZones = [],
  height = 520,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const geoPoints = measurements.filter(
      (m) => m.latitude !== null && m.latitude !== undefined && m.longitude !== null && m.longitude !== undefined
    );

    let initialCenter: [number, number] = [0, 0];
    let initialZoom = 18;

    if (geoPoints.length > 0) {
      initialCenter = [geoPoints[0].latitude!, geoPoints[0].longitude!];
    }

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
      });

      // OpenStreetMap tiles with dark mode CSS filter (no API key required)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: "map-tiles-dark",
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing marker layers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    if (geoPoints.length === 0) return;

    // Draw path
    const latLngs: [number, number][] = geoPoints.map((m) => [m.latitude!, m.longitude!]);
    L.polyline(latLngs, {
      color: "#64748b",
      weight: 2,
      dashArray: "4, 6",
      opacity: 0.6,
    }).addTo(map);

    // Draw measurement circles
    geoPoints.forEach((m) => {
      const color = getRssiColor(m.rssi);
      const circle = L.circleMarker([m.latitude!, m.longitude!], {
        radius: 7,
        fillColor: color,
        color: "#ffffff",
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85,
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; color: #1e293b;">
          <strong>Point #${m.id}</strong> - ${formatClassificationName(m.classification)}<br/>
          <strong>RSSI:</strong> ${m.rssi} dBm (${m.signal_quality}%)<br/>
          <strong>Network:</strong> ${m.ssid}<br/>
          ${m.band ? `<strong>Band:</strong> ${m.band}<br/>` : ""}
          ${m.channel ? `<strong>Channel:</strong> ${m.channel}<br/>` : ""}
          <span style="font-size: 11px; color: #64748b;">${new Date(m.timestamp).toLocaleTimeString()}</span>
        </div>
      `);
    });

    // Draw dead zones with pulsing red marker
    deadZones.forEach((dz) => {
      if (dz.latitude && dz.longitude) {
        const marker = L.circleMarker([dz.latitude, dz.longitude], {
          radius: 12,
          fillColor: "#ef4444",
          color: "#b91c1c",
          weight: 2,
          fillOpacity: 0.4,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; color: #1e293b;">
            <strong style="color: #dc2626;">Dead Zone Detected</strong><br/>
            <strong>Signal:</strong> ${dz.rssi} dBm (${dz.severity.toUpperCase()})<br/>
            <strong>Causes:</strong> ${dz.probable_causes || "Physical obstruction / distance"}<br/>
          </div>
        `);
      }
    });

    // Auto-fit bounds
    if (latLngs.length > 0) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    }
  }, [measurements, deadZones]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100%",
        height,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
      }}
    />
  );
};
