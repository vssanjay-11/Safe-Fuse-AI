"""
SAFE-FUSE AI — Hardware Sensor Simulator
Generates realistic sensor readings that mimic real ESP32 hardware.
Activates automatically when MQTT hardware is not connected.

Sensors simulated:
  - DHT22: Temperature + Humidity
  - MQ-2: Smoke (ppm)
  - MQ-135: Gas/Air Quality (ppm)
  - Dust Sensor: Particle density (µg/m³)
  - Flame Sensor: Boolean detection
  - ACS712: Current (amps) + computed power (watts)
"""

import math
import random
import time
from datetime import datetime
from typing import Dict, Any


class SensorSimulator:
    """
    Realistic industrial sensor simulator.
    Uses sinusoidal base curves with noise and periodic anomaly injection.
    """

    # Factory departments / zones
    ZONES = [
        "Raw Material Store",
        "Mixing Room",
        "Drying Chamber",
        "Packing Area",
        "Storage Vault",
        "Electrical Room",
        "Loading Bay",
    ]

    # Sensor thresholds (warning / critical)
    THRESHOLDS = {
        "temperature":  {"warn": 45.0,  "critical": 60.0,  "unit": "°C"},
        "humidity":     {"warn": 30.0,  "critical": 20.0,  "unit": "%",  "low_danger": True},
        "smoke_ppm":    {"warn": 150.0, "critical": 300.0, "unit": "ppm"},
        "gas_ppm":      {"warn": 200.0, "critical": 400.0, "unit": "ppm"},
        "dust_ugm3":    {"warn": 100.0, "critical": 250.0, "unit": "µg/m³"},
        "flame":        {"warn": 1,     "critical": 1,     "unit": "bool"},
        "current_amps": {"warn": 12.0,  "critical": 18.0,  "unit": "A"},
        "power_watts":  {"warn": 2800,  "critical": 4200,  "unit": "W"},
    }

    def __init__(self):
        self._start_time = time.time()
        self._anomaly_active = False
        self._anomaly_zone = None
        self._anomaly_timer = 0
        self._anomaly_countdown = random.randint(30, 90)  # seconds until next anomaly
        self._cycle = 0

        # Per-zone base values with slight variation
        self._zone_offsets = {
            zone: {
                "temp_offset": random.uniform(-3, 8),
                "humidity_offset": random.uniform(-5, 5),
                "gas_offset": random.uniform(-20, 50),
                "dust_offset": random.uniform(-10, 40),
            }
            for zone in self.ZONES
        }

    def _elapsed(self) -> float:
        return time.time() - self._start_time

    def _sine(self, period: float, amplitude: float, offset: float) -> float:
        """Smooth sinusoidal oscillation."""
        return math.sin(self._elapsed() * 2 * math.pi / period) * amplitude + offset

    def _noise(self, scale: float = 1.0) -> float:
        return random.gauss(0, scale)

    def _check_anomaly(self):
        """Periodically trigger realistic anomaly events."""
        self._anomaly_timer += 2
        if not self._anomaly_active and self._anomaly_timer >= self._anomaly_countdown:
            self._anomaly_active = True
            self._anomaly_zone = random.choice(self.ZONES)
            self._anomaly_duration = random.randint(20, 60)
            self._anomaly_start = self._anomaly_timer
            self._anomaly_countdown = random.randint(45, 120)
            self._anomaly_timer = 0
            print(f"[SIM] [WARN] Anomaly triggered in zone: {self._anomaly_zone}")

        if self._anomaly_active:
            elapsed_anomaly = self._anomaly_timer - self._anomaly_start if hasattr(self, '_anomaly_start') else 0
            if self._anomaly_timer >= self._anomaly_duration:
                self._anomaly_active = False
                self._anomaly_zone = None
                print(f"[SIM] [OK] Anomaly resolved")

    def get_readings(self) -> Dict[str, Any]:
        """Generate a complete sensor reading snapshot."""
        self._cycle += 1
        self._check_anomaly()

        elapsed = self._elapsed()
        sensors = []

        for i, zone in enumerate(self.ZONES):
            offsets = self._zone_offsets[zone]
            is_anomaly_zone = self._anomaly_active and self._anomaly_zone == zone

            # ─── Temperature (DHT22) ───────────────────────────────────
            base_temp = self._sine(period=300, amplitude=8, offset=38) + offsets["temp_offset"]
            if is_anomaly_zone:
                base_temp += random.uniform(15, 30)  # dangerous spike
            temp = round(max(20, min(90, base_temp + self._noise(0.5))), 1)

            # ─── Humidity (DHT22) ──────────────────────────────────────
            base_hum = self._sine(period=400, amplitude=12, offset=52) + offsets["humidity_offset"]
            if is_anomaly_zone:
                base_hum -= random.uniform(15, 25)  # drops during heat/fire
            humidity = round(max(5, min(95, base_hum + self._noise(1.0))), 1)

            # ─── Smoke / Gas (MQ-2) ───────────────────────────────────
            base_smoke = self._sine(period=180, amplitude=30, offset=80) + offsets["gas_offset"] * 0.5
            if is_anomaly_zone:
                base_smoke += random.uniform(200, 500)
            smoke_ppm = round(max(0, base_smoke + self._noise(5)), 1)

            # ─── Air Quality / Gas (MQ-135) ───────────────────────────
            base_gas = self._sine(period=250, amplitude=40, offset=120) + offsets["gas_offset"]
            if is_anomaly_zone:
                base_gas += random.uniform(250, 600)
            gas_ppm = round(max(0, base_gas + self._noise(8)), 1)

            # ─── Dust (GP2Y1010AU0F) ──────────────────────────────────
            base_dust = self._sine(period=350, amplitude=25, offset=65) + offsets["dust_offset"]
            if is_anomaly_zone:
                base_dust += random.uniform(100, 300)
            dust_ugm3 = round(max(0, base_dust + self._noise(5)), 1)

            # ─── Flame Sensor ─────────────────────────────────────────
            # Flame detected if smoke very high OR explicit anomaly
            flame_detected = bool(
                (is_anomaly_zone and random.random() < 0.4) or
                smoke_ppm > 400 or
                (temp > 65 and gas_ppm > 350)
            )

            # ─── Current (ACS712) ─────────────────────────────────────
            base_current = self._sine(period=600, amplitude=2, offset=8.5)
            if is_anomaly_zone:
                base_current += random.uniform(5, 12)
            current_amps = round(max(0, min(25, base_current + self._noise(0.3))), 2)
            power_watts = round(current_amps * 240, 1)  # 240V nominal

            # ─── Build sensor reading dict ─────────────────────────────
            def sensor_status(value, sensor_key):
                t = self.THRESHOLDS.get(sensor_key, {})
                low_danger = t.get("low_danger", False)
                warn = t.get("warn", 9999)
                crit = t.get("critical", 9999)
                if low_danger:
                    if value <= crit: return "critical"
                    if value <= warn: return "warning"
                    return "normal"
                else:
                    if value >= crit: return "critical"
                    if value >= warn: return "warning"
                    return "normal"

            sensors.append({
                "zone": zone,
                "zone_index": i,
                "temperature": temp,
                "humidity": humidity,
                "smoke_ppm": smoke_ppm,
                "gas_ppm": gas_ppm,
                "dust_ugm3": dust_ugm3,
                "flame_detected": flame_detected,
                "current_amps": current_amps,
                "power_watts": power_watts,
                "status": {
                    "temperature": sensor_status(temp, "temperature"),
                    "humidity": sensor_status(humidity, "humidity"),
                    "smoke_ppm": sensor_status(smoke_ppm, "smoke_ppm"),
                    "gas_ppm": sensor_status(gas_ppm, "gas_ppm"),
                    "dust_ugm3": sensor_status(dust_ugm3, "dust_ugm3"),
                    "flame": "critical" if flame_detected else "normal",
                    "current_amps": sensor_status(current_amps, "current_amps"),
                },
                "anomaly_active": is_anomaly_zone,
                "timestamp": datetime.utcnow().isoformat(),
            })

        # ─── Aggregate (plant-wide averages) ──────────────────────────
        agg = {
            "temperature": round(sum(s["temperature"] for s in sensors) / len(sensors), 1),
            "humidity": round(sum(s["humidity"] for s in sensors) / len(sensors), 1),
            "smoke_ppm": round(sum(s["smoke_ppm"] for s in sensors) / len(sensors), 1),
            "gas_ppm": round(sum(s["gas_ppm"] for s in sensors) / len(sensors), 1),
            "dust_ugm3": round(sum(s["dust_ugm3"] for s in sensors) / len(sensors), 1),
            "flame_detected": any(s["flame_detected"] for s in sensors),
            "current_amps": round(sum(s["current_amps"] for s in sensors) / len(sensors), 2),
            "power_watts": round(sum(s["power_watts"] for s in sensors), 1),
            "active_zones": len(self.ZONES),
            "anomaly_zone": self._anomaly_zone,
            "anomaly_active": self._anomaly_active,
        }

        return {"zones": sensors, "aggregate": agg, "source": "simulation", "cycle": self._cycle}


# Singleton
sensor_simulator = SensorSimulator()
