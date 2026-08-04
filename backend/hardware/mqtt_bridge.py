"""
SAFE-FUSE AI — MQTT Hardware Bridge
Listens for real ESP32 sensor data published via MQTT.
When active, overrides the software simulator with real hardware readings.

ESP32 publishes to: safefuse/sensors/data
Platform subscribes and updates shared app_state.

Topic format: safefuse/sensors/data
Payload: JSON with all sensor values
"""

import json
import threading
import time
from datetime import datetime
from typing import Optional, Callable

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False
    print("[MQTT] paho-mqtt not installed. Hardware mode unavailable.")


class MQTTBridge:
    """
    MQTT bridge connecting ESP32 hardware to the SAFE-FUSE AI backend.
    Runs in a background thread; non-blocking.
    """

    def __init__(self):
        self.client: Optional[object] = None
        self.connected = False
        self.last_received: Optional[datetime] = None
        self.broker_host = "localhost"
        self.broker_port = 1883
        self.topic_subscribe = "safefuse/sensors/#"
        self.topic_commands = "safefuse/commands"
        self._callback: Optional[Callable] = None
        self._thread: Optional[threading.Thread] = None

    def set_data_callback(self, callback: Callable):
        """Register callback for when new sensor data arrives."""
        self._callback = callback

    def configure(self, host: str, port: int = 1883):
        """Update broker configuration."""
        self.broker_host = host
        self.broker_port = port

    def connect(self):
        """Start MQTT connection in background thread."""
        if not MQTT_AVAILABLE:
            print("[MQTT] [ERR] paho-mqtt not available")
            return False

        try:
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="safefuse-backend")
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message

            self.client.connect_async(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
            print(f"[MQTT] 🔌 Connecting to broker {self.broker_host}:{self.broker_port}...")
            return True
        except Exception as e:
            print(f"[MQTT] [ERR] Connection failed: {e}")
            self.connected = False
            return False

    def disconnect(self):
        """Stop MQTT connection."""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
        self.connected = False

    def publish_command(self, device: str, action: str, reason: str = ""):
        """
        Send a command to the ESP32 relay controller.
        device: 'relay1', 'relay2', 'fan', 'humidifier', 'alarm'
        action: 'ON' or 'OFF'
        """
        if not self.connected or not self.client:
            print(f"[MQTT] [WARN] Cannot publish command — not connected")
            return False

        payload = json.dumps({
            "device": device,
            "action": action,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat(),
        })
        topic = f"{self.topic_commands}/{device}"
        self.client.publish(topic, payload, qos=1)
        print(f"[MQTT] 📤 Command sent: {device} → {action}")
        return True

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            self.connected = True
            client.subscribe(self.topic_subscribe, qos=1)
            print(f"[MQTT] [OK] Connected to broker. Subscribed to {self.topic_subscribe}")
        else:
            print(f"[MQTT] [ERR] Connection refused: {reason_code}")

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties):
        self.connected = False
        print(f"[MQTT] [WARN] Disconnected from broker (rc={reason_code})")

    def _on_message(self, client, userdata, msg):
        """Handle incoming sensor data from ESP32."""
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            self.last_received = datetime.utcnow()

            # Normalize ESP32 payload to our internal format
            normalized = self._normalize_esp32_payload(payload)

            if self._callback:
                self._callback(normalized)

        except json.JSONDecodeError as e:
            print(f"[MQTT] [ERR] Invalid JSON from {msg.topic}: {e}")
        except Exception as e:
            print(f"[MQTT] [ERR] Error processing message: {e}")

    def _normalize_esp32_payload(self, raw: dict) -> dict:
        """
        Normalize ESP32 JSON payload to SAFE-FUSE internal format.
        Expected ESP32 format:
        {
            "temp": 38.5, "hum": 45.2, "smoke": 120, "gas": 180,
            "dust": 85, "flame": 0, "current": 8.2, "zone": "Mixing Room"
        }
        """
        zone = raw.get("zone", "Unknown Zone")
        current = raw.get("current", 0.0)

        return {
            "zones": [{
                "zone": zone,
                "zone_index": 0,
                "temperature": float(raw.get("temp", 25)),
                "humidity": float(raw.get("hum", 50)),
                "smoke_ppm": float(raw.get("smoke", 0)),
                "gas_ppm": float(raw.get("gas", 0)),
                "dust_ugm3": float(raw.get("dust", 0)),
                "flame_detected": bool(raw.get("flame", 0)),
                "current_amps": float(current),
                "power_watts": round(float(current) * 240, 1),
                "status": {},
                "anomaly_active": False,
                "timestamp": datetime.utcnow().isoformat(),
            }],
            "aggregate": {
                "temperature": float(raw.get("temp", 25)),
                "humidity": float(raw.get("hum", 50)),
                "smoke_ppm": float(raw.get("smoke", 0)),
                "gas_ppm": float(raw.get("gas", 0)),
                "dust_ugm3": float(raw.get("dust", 0)),
                "flame_detected": bool(raw.get("flame", 0)),
                "current_amps": float(current),
                "power_watts": round(float(current) * 240, 1),
                "active_zones": 1,
                "anomaly_zone": zone if raw.get("flame") or raw.get("smoke", 0) > 200 else None,
                "anomaly_active": bool(raw.get("flame", 0) or raw.get("smoke", 0) > 200),
            },
            "source": "hardware",
            "raw": raw,
        }

    @property
    def status(self) -> dict:
        last_seen = (
            (datetime.utcnow() - self.last_received).total_seconds()
            if self.last_received else None
        )
        return {
            "connected": self.connected,
            "broker": f"{self.broker_host}:{self.broker_port}",
            "last_received": self.last_received.isoformat() if self.last_received else None,
            "seconds_since_last": round(last_seen, 1) if last_seen is not None else None,
            "hardware_active": self.connected and (last_seen is not None and last_seen < 10),
        }


# Singleton
mqtt_bridge = MQTTBridge()
