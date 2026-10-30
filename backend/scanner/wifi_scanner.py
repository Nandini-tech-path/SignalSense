"""
SignalSense - Wi-Fi Adapter & Network Scanner
Communicates directly with Windows Native Wi-Fi stack via netsh and native APIs.
Captures real RSSI, BSSID, SSID, Channel, Band, Frequency, and Signal Quality without fabrication.
"""

import subprocess
import re
import time
from typing import List, Dict, Optional, Any
from datetime import datetime


class WiFiScanner:
    def __init__(self):
        self.last_scan_time: Optional[float] = None
        self._cached_networks: List[Dict[str, Any]] = []

    def get_adapter_status(self) -> Dict[str, Any]:
        """
        Inspects the primary Wi-Fi interface status on the system.
        Returns interface name, hardware description, state, and currently connected network info.
        """
        try:
            result = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False
            )
            output = result.stdout

            if "There is no wireless interface on the system" in output or not output.strip():
                return {
                    "available": False,
                    "state": "not_present",
                    "interface_name": None,
                    "description": None,
                    "connected": False,
                    "connected_network": None,
                    "message": "No active wireless interface found on this system."
                }

            # Parse interface attributes
            name_match = re.search(r"Name\s*:\s*(.+)", output)
            desc_match = re.search(r"Description\s*:\s*(.+)", output)
            state_match = re.search(r"State\s*:\s*(.+)", output)
            ssid_match = re.search(r"SSID\s*:\s*(.+)", output)
            bssid_match = re.search(r"AP BSSID\s*:\s*([0-9a-fA-F:]{17})", output)
            band_match = re.search(r"Band\s*:\s*(.+)", output)
            channel_match = re.search(r"Channel\s*:\s*(\d+)", output)
            radio_match = re.search(r"Radio type\s*:\s*(.+)", output)
            signal_match = re.search(r"Signal\s*:\s*(\d+)%", output)
            rssi_match = re.search(r"Rssi\s*:\s*(-?\d+)", output)
            rx_match = re.search(r"Receive rate \(Mbps\)\s*:\s*([\d\.]+)", output)
            tx_match = re.search(r"Transmit rate \(Mbps\)\s*:\s*([\d\.]+)", output)

            state = state_match.group(1).strip() if state_match else "unknown"
            is_connected = "connected" in state.lower()

            connected_info = None
            if is_connected and ssid_match:
                signal_pct = int(signal_match.group(1)) if signal_match else None
                # If explicit RSSI dBm is given by Windows driver:
                if rssi_match:
                    rssi_val = int(rssi_match.group(1))
                elif signal_pct is not None:
                    # IEEE 802.11 standard conversion: RSSI (dBm) = (Signal % / 2) - 100
                    rssi_val = int(round((signal_pct / 2.0) - 100))
                else:
                    rssi_val = -70

                connected_info = {
                    "ssid": ssid_match.group(1).strip(),
                    "bssid": bssid_match.group(1).strip() if bssid_match else "Unknown",
                    "signal_percent": signal_pct,
                    "rssi": rssi_val,
                    "band": band_match.group(1).strip() if band_match else "Unknown",
                    "channel": int(channel_match.group(1)) if channel_match else None,
                    "radio_type": radio_match.group(1).strip() if radio_match else "Unknown",
                    "rx_rate_mbps": float(rx_match.group(1)) if rx_match else None,
                    "tx_rate_mbps": float(tx_match.group(1)) if tx_match else None,
                }

            return {
                "available": True,
                "state": state,
                "interface_name": name_match.group(1).strip() if name_match else "Wi-Fi",
                "description": desc_match.group(1).strip() if desc_match else "Wireless Adapter",
                "connected": is_connected,
                "connected_network": connected_info,
                "message": "Wi-Fi adapter is operational."
            }
        except subprocess.TimeoutExpired:
            return {
                "available": False,
                "state": "timeout",
                "message": "Wi-Fi query timed out. The adapter may be busy or disabled."
            }
        except Exception as e:
            return {
                "available": False,
                "state": "error",
                "message": f"Error inspecting Wi-Fi adapter: {str(e)}"
            }

    def scan_networks(self) -> List[Dict[str, Any]]:
        """
        Executes a real scan of visible networks using netsh wlan show networks mode=bssid.
        Returns a clean, structured list of all detected access points.
        """
        networks: List[Dict[str, Any]] = []

        try:
            # First fetch the connected network's hardware RSSI to calibrate if present
            adapter_status = self.get_adapter_status()
            connected_net = adapter_status.get("connected_network") or {}
            connected_bssid = connected_net.get("bssid", "").lower()
            connected_rssi = connected_net.get("rssi")

            # Run netsh wlan show networks mode=bssid
            result = subprocess.run(
                ["netsh", "wlan", "show", "networks", "mode=bssid"],
                capture_output=True,
                text=True,
                timeout=8,
                check=False
            )
            output = result.stdout

            # Parse SSID blocks
            ssid_blocks = re.split(r"\nSSID\s+\d+\s*:\s*", "\n" + output)
            timestamp = datetime.utcnow().isoformat() + "Z"

            for block in ssid_blocks[1:]:
                lines = block.splitlines()
                if not lines:
                    continue

                raw_ssid = lines[0].strip()
                ssid_name = raw_ssid if raw_ssid else "[Hidden SSID]"

                # Network Type & Auth
                net_type_match = re.search(r"Network type\s*:\s*(.+)", block)
                auth_match = re.search(r"Authentication\s*:\s*(.+)", block)
                enc_match = re.search(r"Encryption\s*:\s*(.+)", block)

                auth_str = auth_match.group(1).strip() if auth_match else "Open"
                enc_str = enc_match.group(1).strip() if enc_match else "None"

                # Parse each BSSID block within this SSID
                bssid_sections = re.split(r"\s+BSSID\s+\d+\s*:\s*", block)
                for b_sec in bssid_sections[1:]:
                    b_lines = b_sec.strip().splitlines()
                    if not b_lines:
                        continue
                    bssid_mac = b_lines[0].strip()

                    sig_match = re.search(r"Signal\s*:\s*(\d+)%", b_sec)
                    radio_match = re.search(r"Radio type\s*:\s*(.+)", b_sec)
                    band_match = re.search(r"Band\s*:\s*(.+)", b_sec)
                    ch_match = re.search(r"Channel\s*:\s*(\d+)", b_sec)

                    signal_pct = int(sig_match.group(1)) if sig_match else 0
                    channel = int(ch_match.group(1)) if ch_match else 0
                    band = band_match.group(1).strip() if band_match else self._infer_band_from_channel(channel)
                    radio = radio_match.group(1).strip() if radio_match else "802.11"

                    # Calculate RSSI: if this matches currently connected BSSID and hardware RSSI exists, use it
                    if connected_bssid and bssid_mac.lower() == connected_bssid and connected_rssi is not None:
                        rssi_dbm = connected_rssi
                    else:
                        # Windows standard mapping: 100% -> -50 dBm, 0% -> -100 dBm
                        rssi_dbm = int(round((signal_pct / 2.0) - 100))

                    freq_mhz = self._channel_to_frequency(channel, band)

                    networks.append({
                        "ssid": ssid_name,
                        "bssid": bssid_mac,
                        "rssi": rssi_dbm,
                        "signal_quality": signal_pct,
                        "channel": channel,
                        "band": band,
                        "frequency": freq_mhz,
                        "radio_type": radio,
                        "authentication": auth_str,
                        "encryption": enc_str,
                        "is_connected": (bssid_mac.lower() == connected_bssid) if connected_bssid else False,
                        "timestamp": timestamp
                    })

            self.last_scan_time = time.time()
            self._cached_networks = networks
            return networks

        except Exception as e:
            print(f"Error scanning Wi-Fi networks: {e}")
            return self._cached_networks

    def get_live_reading_for_network(self, target_ssid: str, target_bssid: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Polls the Wi-Fi adapter quickly for the current signal reading of a specific network.
        Used during real-time surveying to record accurate walk-around samples.
        """
        # If currently connected to the network, netsh show interfaces provides instantaneous sub-second metrics
        adapter = self.get_adapter_status()
        conn = adapter.get("connected_network")

        if conn and conn.get("ssid") == target_ssid:
            if not target_bssid or conn.get("bssid", "").lower() == target_bssid.lower():
                return {
                    "ssid": conn["ssid"],
                    "bssid": conn["bssid"],
                    "rssi": conn["rssi"],
                    "signal_quality": conn["signal_percent"],
                    "channel": conn["channel"],
                    "band": conn["band"],
                    "frequency": self._channel_to_frequency(conn["channel"] or 0, conn["band"] or ""),
                    "radio_type": conn["radio_type"],
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }

        # Otherwise do a scan of visible networks
        networks = self.scan_networks()
        for net in networks:
            if net["ssid"] == target_ssid:
                if not target_bssid or net["bssid"].lower() == target_bssid.lower():
                    return net

        return None

    @staticmethod
    def _infer_band_from_channel(channel: int) -> str:
        if 1 <= channel <= 14:
            return "2.4 GHz"
        elif 36 <= channel <= 177:
            return "5 GHz"
        elif channel > 180:
            return "6 GHz"
        return "Unknown"

    @staticmethod
    def _channel_to_frequency(channel: int, band: str) -> int:
        """Converts Wi-Fi channel to center frequency in MHz."""
        if 1 <= channel <= 13:
            return 2407 + (channel * 5)
        elif channel == 14:
            return 2484
        elif 36 <= channel <= 177:
            return 5000 + (channel * 5)
        elif channel > 180:
            return 5950 + (channel * 5)
        return 2412 if "2.4" in band else 5180


# Global singleton instance
scanner_instance = WiFiScanner()
