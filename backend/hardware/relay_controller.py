"""
SAFE-FUSE AI — Relay Controller
Sends commands to ESP32 to control:
  - Relay 1 → Cooling Fan (12V)
  - Relay 2 → Humidifier
  - Alarm → Active Buzzer + Warning LEDs

Commands go via MQTT bridge if hardware connected,
or update software simulation state if in sim mode.
"""

from datetime import datetime
from typing import Dict, Any
import uuid


class RelayController:
    """
    Controls all actuators (fan, humidifier, alarm).
    Works in both hardware (MQTT) and simulation mode.
    """

    def __init__(self):
        # Current relay states
        self.states: Dict[str, bool] = {
            "relay1": False,   # Cooling Fan
            "relay2": False,   # Exhaust Fan
            "humidifier": False,
            "alarm": False,
            "warning_led": False,
        }
        # History of relay events (in-memory, last 100)
        self.history = []
        self._mqtt = None

    def set_mqtt(self, mqtt_bridge):
        """Inject MQTT bridge dependency."""
        self._mqtt = mqtt_bridge

    def activate(self, device: str, reason: str = "Manual", triggered_by: str = "manual") -> Dict[str, Any]:
        """Turn a device ON."""
        return self._set(device, True, reason, triggered_by)

    def deactivate(self, device: str, reason: str = "Manual", triggered_by: str = "manual") -> Dict[str, Any]:
        """Turn a device OFF."""
        return self._set(device, False, reason, triggered_by)

    def _set(self, device: str, state: bool, reason: str, triggered_by: str) -> Dict[str, Any]:
        if device not in self.states:
            return {"success": False, "error": f"Unknown device: {device}"}

        prev_state = self.states[device]
        self.states[device] = state
        action = "ON" if state else "OFF"

        # Send MQTT command if hardware connected
        if self._mqtt and self._mqtt.connected:
            self._mqtt.publish_command(device, action, reason)
            source = "hardware"
        else:
            source = "simulation"

        event = {
            "event_id": f"REL-{uuid.uuid4().hex[:8].upper()}",
            "device": device,
            "device_label": self._device_label(device),
            "action": action,
            "reason": reason,
            "triggered_by": triggered_by,
            "source": source,
            "timestamp": datetime.utcnow().isoformat(),
            "previous_state": prev_state,
        }
        self.history.insert(0, event)
        if len(self.history) > 100:
            self.history.pop()

        print(f"[RELAY] {device} → {action} | {reason} | {source}")
        return {"success": True, **event}

    def execute_mitigation(self, actions: list, hazard_score: float = 0) -> list:
        """
        Execute a list of mitigation actions decided by the AI.
        actions: list of dicts with 'device' and 'action' keys
        """
        results = []
        for act in actions:
            device = act.get("device")
            action = act.get("action", "ON")
            reason = act.get("reason", "AI Mitigation")
            if action == "ON":
                result = self.activate(device, reason, triggered_by="AI")
            else:
                result = self.deactivate(device, reason, triggered_by="AI")
            results.append(result)
        return results

    def _device_label(self, device: str) -> str:
        labels = {
            "relay1": "Cooling Fan",
            "relay2": "Exhaust Fan",
            "humidifier": "Humidifier",
            "alarm": "Alarm / Buzzer",
            "warning_led": "Warning LED",
        }
        return labels.get(device, device)

    def get_status(self) -> Dict[str, Any]:
        return {
            "relay1": {"on": self.states["relay1"], "label": "Cooling Fan"},
            "relay2": {"on": self.states["relay2"], "label": "Exhaust Fan"},
            "humidifier": {"on": self.states["humidifier"], "label": "Humidifier"},
            "alarm": {"on": self.states["alarm"], "label": "Alarm / Buzzer"},
            "warning_led": {"on": self.states["warning_led"], "label": "Warning LED"},
            "recent_events": self.history[:10],
        }


# Singleton
relay_controller = RelayController()
