import unittest
import os
import sys

# Ensure repository root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.scanner.wifi_scanner import WiFiScanner
from backend.services.analysis_service import AnalysisService
from backend.models.models import Measurement, AppSettings


class TestSignalSenseEngine(unittest.TestCase):

    def setUp(self):
        self.settings = AppSettings(
            excellent_threshold=-50,
            good_threshold=-60,
            fair_threshold=-70,
            weak_threshold=-80,
            dead_threshold=-80,
        )

    def test_signal_classification(self):
        """Test standard networking thresholds."""
        self.assertEqual(AnalysisService.classify_signal(-42, self.settings), "excellent")
        self.assertEqual(AnalysisService.classify_signal(-55, self.settings), "good")
        self.assertEqual(AnalysisService.classify_signal(-65, self.settings), "fair")
        self.assertEqual(AnalysisService.classify_signal(-75, self.settings), "weak")
        self.assertEqual(AnalysisService.classify_signal(-85, self.settings), "dead")

    def test_summary_statistics_and_coverage(self):
        """Test calculation of usable coverage percentage and dead zones."""
        meas = [
            Measurement(id=1, rssi=-45, classification="excellent"),
            Measurement(id=2, rssi=-55, classification="good"),
            Measurement(id=3, rssi=-65, classification="fair"),
            Measurement(id=4, rssi=-75, classification="weak"),
            Measurement(id=5, rssi=-85, classification="dead"),
        ]
        stats = AnalysisService.compute_summary_statistics(meas)
        self.assertEqual(stats["total_measurements"], 5)
        self.assertEqual(stats["dead_zone_count"], 1)
        self.assertEqual(stats["weak_zone_count"], 1)
        # Usable coverage = (excellent + good + fair) / 5 = 60.0%
        self.assertEqual(stats["coverage_score"], 60.0)
        self.assertEqual(stats["min_rssi"], -85)
        self.assertEqual(stats["max_rssi"], -45)

    def test_idw_spatial_interpolation(self):
        """Test Inverse Distance Weighting interpolation with real sample points."""
        meas = [
            Measurement(id=1, x=10.0, y=10.0, rssi=-40, classification="excellent"),
            Measurement(id=2, x=20.0, y=10.0, rssi=-55, classification="good"),
            Measurement(id=3, x=30.0, y=20.0, rssi=-70, classification="fair"),
            Measurement(id=4, x=40.0, y=30.0, rssi=-85, classification="dead"),
        ]
        grid = AnalysisService.compute_idw_heatmap(meas, grid_resolution=10, power=2.0)
        self.assertEqual(grid["status"], "ready")
        self.assertGreater(len(grid["cells"]), 0)

        # Test insufficient points (< 3 points)
        few_meas = [
            Measurement(id=1, x=10.0, y=10.0, rssi=-40, classification="excellent")
        ]
        grid_few = AnalysisService.compute_idw_heatmap(few_meas)
        self.assertEqual(grid_few["status"], "insufficient_data")

    def test_real_wifi_scanner_query(self):
        """Test that the physical Wi-Fi scanner runs without crashing and queries real interfaces."""
        scanner = WiFiScanner()
        status = scanner.get_adapter_status()
        self.assertIn("available", status)
        self.assertIn("state", status)
        print(f"\n[Test Output] Physical Adapter State: {status['state']}, Name: {status.get('interface_name')}")


if __name__ == "__main__":
    unittest.main()
