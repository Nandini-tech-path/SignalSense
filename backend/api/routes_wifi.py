from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from backend.scanner.wifi_scanner import scanner_instance
from backend.schemas.schemas import AdapterStatusResponse, WiFiNetwork

router = APIRouter(prefix="/api/wifi", tags=["Wi-Fi"])


@router.get("/status", response_model=AdapterStatusResponse)
def get_wifi_status():
    """Inspects the local system's Wi-Fi adapter readiness and connected network."""
    status = scanner_instance.get_adapter_status()
    return {
        "available": status["available"],
        "state": status["state"],
        "interface_name": status.get("interface_name"),
        "description": status.get("description"),
        "connected": status["connected"],
        "connected_network": status.get("connected_network"),
        "location_service_available": True,
        "storage_ready": True,
        "scanner_ready": status["available"],
        "message": status["message"]
    }


@router.post("/scan", response_model=List[WiFiNetwork])
def scan_wifi_networks():
    """
    Executes a real physical scan on the machine's Wi-Fi adapter.
    Returns all detected SSIDs, BSSIDs, RSSI dBm values, channels, and bands.
    """
    networks = scanner_instance.scan_networks()
    return networks


@router.get("/live-reading")
def get_live_reading(ssid: str = Query(...), bssid: Optional[str] = Query(None)):
    """Polls real-time RF signal metrics for the specified active network."""
    reading = scanner_instance.get_live_reading_for_network(ssid, bssid)
    if not reading:
        # Fall back to checking adapter if connected
        adapter = scanner_instance.get_adapter_status()
        conn = adapter.get("connected_network")
        if conn and conn.get("ssid") == ssid:
            return conn
        raise HTTPException(status_code=404, detail=f"Network '{ssid}' not currently detected in range.")
    return reading
