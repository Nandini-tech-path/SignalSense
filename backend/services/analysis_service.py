import math
from typing import List, Dict, Any, Optional, Tuple
from backend.models.models import Measurement, AppSettings


class AnalysisService:

    @staticmethod
    def classify_signal(rssi: int, settings: Optional[AppSettings] = None) -> str:
        """
        Classifies an RSSI value into a standard networking tier.
        Default thresholds:
          -30 to -50 dBm : Excellent
          -50 to -60 dBm : Good
          -60 to -70 dBm : Fair
          -70 to -80 dBm : Weak
          Below -80 dBm  : Dead Zone
        """
        exc = settings.excellent_threshold if settings else -50
        good = settings.good_threshold if settings else -60
        fair = settings.fair_threshold if settings else -70
        weak = settings.weak_threshold if settings else -80

        if rssi >= exc:
            return "excellent"
        elif rssi >= good:
            return "good"
        elif rssi >= fair:
            return "fair"
        elif rssi >= weak:
            return "weak"
        else:
            return "dead"

    @classmethod
    def compute_summary_statistics(cls, measurements: List[Measurement]) -> Dict[str, Any]:
        """Calculates basic and distribution statistics over measurement points."""
        total = len(measurements)
        if total == 0:
            return {
                "total_measurements": 0,
                "coverage_score": 0.0,
                "avg_rssi": None,
                "min_rssi": None,
                "max_rssi": None,
                "classifications": {"excellent": 0, "good": 0, "fair": 0, "weak": 0, "dead": 0},
                "band_distribution": {},
                "channel_distribution": {},
                "dead_zone_count": 0,
                "weak_zone_count": 0,
                "timeline": []
            }

        rssi_values = [m.rssi for m in measurements]
        avg_rssi = sum(rssi_values) / total
        min_rssi = min(rssi_values)
        max_rssi = max(rssi_values)

        counts = {"excellent": 0, "good": 0, "fair": 0, "weak": 0, "dead": 0}
        band_counts: Dict[str, int] = {}
        channel_counts: Dict[str, int] = {}

        for m in measurements:
            tier = m.classification or cls.classify_signal(m.rssi)
            counts[tier] = counts.get(tier, 0) + 1

            if m.band:
                band_counts[m.band] = band_counts.get(m.band, 0) + 1
            if m.channel:
                ch_key = f"Ch {m.channel}"
                channel_counts[ch_key] = channel_counts.get(ch_key, 0) + 1

        # Percentages
        percentages = {k: round((v / total) * 100, 1) for k, v in counts.items()}
        # Coverage score: percentage of points with usable signal (Fair or better, >= -70 dBm)
        usable_count = counts["excellent"] + counts["good"] + counts["fair"]
        coverage_score = round((usable_count / total) * 100, 1)

        # Timeline (chronological RSSI progression)
        timeline = [
            {
                "id": m.id,
                "time": m.timestamp.isoformat() if m.timestamp else "",
                "rssi": m.rssi,
                "classification": m.classification
            }
            for m in measurements
        ]

        return {
            "total_measurements": total,
            "coverage_score": coverage_score,
            "avg_rssi": round(avg_rssi, 1),
            "min_rssi": min_rssi,
            "max_rssi": max_rssi,
            "classifications": percentages,
            "counts": counts,
            "band_distribution": band_counts,
            "channel_distribution": channel_counts,
            "dead_zone_count": counts["dead"],
            "weak_zone_count": counts["weak"],
            "timeline": timeline
        }

    @classmethod
    def compute_idw_heatmap(
        cls,
        measurements: List[Measurement],
        grid_resolution: int = 25,
        power: float = 2.0
    ) -> Dict[str, Any]:
        """
        Inverse Distance Weighting (IDW) spatial interpolation.
        Interpolates measured RSSI values across 2D coordinate space.
        Supports both Geographic (latitude/longitude) and Indoor Cartesian (x/y).
        Ensures points are not manufactured beyond empirical measurement radius.
        """
        if len(measurements) < 3:
            return {
                "coordinate_system": "none",
                "min_x": 0.0,
                "max_x": 0.0,
                "min_y": 0.0,
                "max_y": 0.0,
                "grid_rows": 0,
                "grid_cols": 0,
                "status": "insufficient_data",
                "message": "At least 3 measurement points are required to compute spatial coverage interpolation.",
                "cells": [],
                "sample_count": len(measurements)
            }

        # Check if coordinates are geographic (lat/lon) or indoor (x/y)
        has_geo = any(m.latitude is not None and m.longitude is not None for m in measurements)
        has_xy = any(m.x is not None and m.y is not None for m in measurements)

        pts: List[Tuple[float, float, float]] = []
        coord_sys = "cartesian"

        if has_geo and not has_xy:
            coord_sys = "geographic"
            pts = [(m.longitude, m.latitude, float(m.rssi)) for m in measurements if m.longitude is not None and m.latitude is not None]
        elif has_xy:
            coord_sys = "cartesian"
            pts = [(m.x, m.y, float(m.rssi)) for m in measurements if m.x is not None and m.y is not None]
        else:
            # Generate sequential linear walk coordinates if none provided
            coord_sys = "cartesian"
            for idx, m in enumerate(measurements):
                pts.append((float(idx * 5), float((idx % 3) * 4), float(m.rssi)))

        if len(pts) < 3:
            return {
                "coordinate_system": coord_sys,
                "min_x": 0.0,
                "max_x": 0.0,
                "min_y": 0.0,
                "max_y": 0.0,
                "grid_rows": 0,
                "grid_cols": 0,
                "status": "insufficient_data",
                "message": "Collect more measurements to generate a reliable coverage map.",
                "cells": [],
                "sample_count": len(pts)
            }

        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]

        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)

        span_x = max_x - min_x
        span_y = max_y - min_y

        # Add a 10% safety margin around bounding box
        margin_x = span_x * 0.1 if span_x > 0 else 1.0
        margin_y = span_y * 0.1 if span_y > 0 else 1.0

        min_x -= margin_x
        max_x += margin_x
        min_y -= margin_y
        max_y += margin_y

        step_x = (max_x - min_x) / (grid_resolution - 1) if grid_resolution > 1 else 1.0
        step_y = (max_y - min_y) / (grid_resolution - 1) if grid_resolution > 1 else 1.0

        # Maximum influence radius: do not extrapolate into the void
        diagonal = math.sqrt((span_x or 1.0)**2 + (span_y or 1.0)**2)
        max_radius = diagonal * 0.65  # Points farther than this from any measurement receive no fabricated coverage

        cells = []
        for r in range(grid_resolution):
            gy = min_y + r * step_y
            for c in range(grid_resolution):
                gx = min_x + c * step_x

                weights_sum = 0.0
                values_sum = 0.0
                min_dist = float("inf")
                exact_match = None

                for px, py, val in pts:
                    dist = math.sqrt((gx - px)**2 + (gy - py)**2)
                    if dist < min_dist:
                        min_dist = dist

                    if dist < 1e-6:
                        exact_match = val
                        break

                    w = 1.0 / (dist ** power)
                    weights_sum += w
                    values_sum += w * val

                # Skip if too far from any real measurement
                if min_dist > max_radius:
                    continue

                if exact_match is not None:
                    interp_rssi = exact_match
                else:
                    interp_rssi = values_sum / weights_sum if weights_sum > 0 else -85.0

                tier = cls.classify_signal(int(round(interp_rssi)))
                cells.append({
                    "x": round(gx, 6),
                    "y": round(gy, 6),
                    "rssi": round(interp_rssi, 1),
                    "classification": tier
                })

        return {
            "session_id": "",
            "coordinate_system": coord_sys,
            "min_x": round(min_x, 6),
            "max_x": round(max_x, 6),
            "min_y": round(min_y, 6),
            "max_y": round(max_y, 6),
            "grid_rows": grid_resolution,
            "grid_cols": grid_resolution,
            "status": "ready",
            "message": f"Inverse Distance Weighting coverage map generated from {len(pts)} spatial measurements.",
            "cells": cells,
            "sample_count": len(pts)
        }

    @classmethod
    def generate_recommendations(
        cls,
        summary: Dict[str, Any],
        selected_ssid: str
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes practical, evidence-based recommendations according to
        fundamental Computer Networks radio propagation principles:
        - Free-Space Path Loss (FSPL) and log-distance shadow fading
        - RF Material Penetration (2.4 GHz vs 5 GHz attenuation)
        - Channel Congestion and Non-Overlapping Channels
        - Access Point Placement Geometry
        """
        recs = []
        dead_count = summary.get("dead_zone_count", 0)
        weak_count = summary.get("weak_zone_count", 0)
        coverage_score = summary.get("coverage_score", 100.0)
        avg_rssi = summary.get("avg_rssi") or -60.0
        band_dist = summary.get("band_distribution", {})

        # 1. Dead Zone Severity Alert
        if dead_count > 0:
            recs.append({
                "category": "Coverage Deficit",
                "title": f"{dead_count} Critical Dead Zone{'s' if dead_count > 1 else ''} Identified",
                "severity": "critical",
                "description": f"Areas where Wi-Fi signal drops below -80 dBm suffer frequent TCP connection resets, high packet loss (>25%), and interface disconnections.",
                "possible_causes": [
                    "Excessive distance from the wireless access point exceeding link budget",
                    "Dense physical barriers such as reinforced concrete, brickwork, or metal plumbing",
                    "Multipath cancellation causing localized destructive RF interference",
                    "Access point positioned on the floor or enclosed inside furniture"
                ],
                "suggested_actions": [
                    "Relocate the primary router/AP to a more central, elevated position (1.5m - 2m height)",
                    "Deploy an 802.11 Wi-Fi mesh node or dedicated access point near the boundary of the weak zone",
                    "Avoid enclosing router in cabinets or behind metal appliances",
                    "Check line-of-sight pathways between AP and problematic areas"
                ]
            })

        # 2. Weak Zone Pre-emption
        if weak_count > 0 and dead_count == 0:
            recs.append({
                "category": "Signal Attenuation",
                "title": f"{weak_count} Weak Signal Zone{'s' if weak_count > 1 else ''} Detected",
                "severity": "warning",
                "description": "Signal is between -70 dBm and -80 dBm. While standard web traffic may work, latency-sensitive applications like VoIP and video calls will experience degradation.",
                "possible_causes": [
                    "Signal absorption through multiple interior walls or heavy doors",
                    "Reflection and shadow fading from large furniture",
                    "Antenna orientation mismatch (dipole antennas radiate in an omnidirectional donut pattern)"
                ],
                "suggested_actions": [
                    "Adjust external router antenna orientation (keep one vertical and one at 45 degrees)",
                    "Move client desks or devices 1–2 meters away from thick load-bearing partitions",
                    "Verify if client can switch to 2.4 GHz in fringe areas for superior penetration"
                ]
            })

        # 3. Frequency Band Utilization (2.4 GHz vs 5 GHz)
        has_24 = "2.4 GHz" in band_dist
        has_5 = "5 GHz" in band_dist

        if has_5 and (dead_count > 0 or weak_count > 0):
            recs.append({
                "category": "Band Allocation",
                "title": "Dual-Band Frequency Trade-Off",
                "severity": "info",
                "description": "5 GHz provides significantly higher data rates and channel capacity, but suffers ~6-10 dB higher path loss through walls compared to 2.4 GHz.",
                "possible_causes": [
                    "5 GHz electromagnetic waves experience higher material attenuation due to shorter wavelength (λ ≈ 5.8 cm vs λ ≈ 12.5 cm)",
                    "Client device may be rigidly latching onto 5 GHz even when RSSI drops below roaming threshold"
                ],
                "suggested_actions": [
                    "Enable Band Steering with aggressive roaming RSSI threshold (-72 dBm)",
                    "Separate SSIDs (e.g. MyWiFi_2.4G and MyWiFi_5G) to manually assign remote devices to 2.4 GHz",
                    "Ensure 2.4 GHz is tuned to non-overlapping channels 1, 6, or 11"
                ]
            })

        # 4. Overall Health & Placement
        if coverage_score >= 90:
            recs.append({
                "category": "Network Health",
                "title": "Robust Area Coverage",
                "severity": "info",
                "description": f"{selected_ssid} maintains a high overall coverage rating of {coverage_score}%.",
                "possible_causes": [
                    "Favorable access point geometry and balanced transmit power",
                    "Low obstruction along the surveyed walking path"
                ],
                "suggested_actions": [
                    "Preserve current router position and orientation",
                    "Periodically re-survey when moving furniture or adding heavy electronic appliances"
                ]
            })

        return recs
