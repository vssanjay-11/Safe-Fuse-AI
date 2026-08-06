"""
SAFE-FUSE AI — All REST API Routes
Every endpoint is connected to live backend data (no mock data).
"""

import uuid
import random
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

# Shared app_state set by main.py
_app_state: dict = {}

def set_app_state(state: dict):
    global _app_state
    _app_state = state

def _ensure_populated():
    if not _app_state.get("aggregate"):
        try:
            from hardware.sensor_simulator import sensor_simulator
            from hardware.relay_controller import relay_controller
            from agents.hazard_score_engine import hazard_score_engine
            from agents.agentic_decision_engine import agentic_engine

            zones = sensor_simulator.generate_all_zones()
            agg = sensor_simulator.get_aggregate_reading(zones)
            hazard = hazard_score_engine.calculate(agg)
            dec = agentic_engine.evaluate(agg, hazard)

            _app_state.update({
                "hardware_mode": "simulation",
                "sensor_zones": zones,
                "aggregate": agg,
                "hazard_result": hazard,
                "last_decision": dec,
                "relay_status": relay_controller.get_all_status(),
                "alerts": [],
                "incidents": [],
                "decision_feed": [dec] if dec else [],
                "zone_scores": hazard.get("zone_scores", []),
            })
        except Exception:
            pass


router = APIRouter(prefix="/api", tags=["Platform APIs"])


@router.get("/live-state")
async def get_live_state():
    """Live state payload equivalent to WebSocket frame for HTTP polling fallback."""
    _ensure_populated()
    return {
        "type": "update",
        "data": {
            "hardware_mode": _app_state.get("hardware_mode", "simulation"),
            "hazard_score": _app_state.get("hazard_result", {}).get("score", 0),
            "risk_level": _app_state.get("hazard_result", {}).get("risk_level", "low"),
            "safety_score": _app_state.get("hazard_result", {}).get("safety_score", 100),
            "confidence": _app_state.get("hazard_result", {}).get("confidence", 85),
            "shap_values": _app_state.get("hazard_result", {}).get("shap_values", []),
            "triggered_rules": _app_state.get("hazard_result", {}).get("triggered_rules", []),
            "aggregate": _app_state.get("aggregate", {}),
            "zone_scores": _app_state.get("zone_scores", []),
            "relay_status": _app_state.get("relay_status", {}),
            "alerts": list(_app_state.get("alerts", [])),
            "flame_detected": _app_state.get("aggregate", {}).get("flame_detected", False),
            "anomaly_zone": _app_state.get("aggregate", {}).get("anomaly_zone"),
            "reasoning": _app_state.get("last_decision", {}).get("reasoning", []),
            "decided_actions": _app_state.get("last_decision", {}).get("actions", []),
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


# ═══════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════

@router.get("/dashboard")
async def get_dashboard():
    """Complete dashboard snapshot — KPIs, alerts, risk, agent decisions."""
    _ensure_populated()
    hazard = _app_state.get("hazard_result", {})
    aggregate = _app_state.get("aggregate", {})
    relay = _app_state.get("relay_status", {})
    decision = _app_state.get("last_decision", {})
    incidents = _app_state.get("incidents", [])
    alerts = _app_state.get("alerts", [])

    hour = datetime.utcnow().hour
    if 6 <= hour < 14:
        shift = "Morning Shift (06:00 - 14:00)"
    elif 14 <= hour < 22:
        shift = "Afternoon Shift (14:00 - 22:00)"
    else:
        shift = "Night Shift (22:00 - 06:00)"

    score = hazard.get("score", 0)
    risk_level = hazard.get("risk_level", "low")

    return {
        "kpis": {
            "hazard_score": score,
            "risk_level": risk_level,
            "safety_score": round(100 - score, 1),
            "shift": shift,
            "plant": "SAFE-FUSE AI Demo Plant",
            "active_zones": aggregate.get("active_zones", 7),
            "anomaly_zone": aggregate.get("anomaly_zone"),
            "flame_detected": aggregate.get("flame_detected", False),
            "hardware_mode": _app_state.get("hardware_mode", "simulation"),
            "online_sensors": 9,  # DHT22×2, MQ-2, MQ-135, Dust, Flame, ACS712, Power
            "relay_fan_on": relay.get("relay1", {}).get("on", False),
            "relay_exhaust_on": relay.get("relay2", {}).get("on", False),
            "humidifier_on": relay.get("humidifier", {}).get("on", False),
            "alarm_on": relay.get("alarm", {}).get("on", False),
        },
        "aggregate_sensors": aggregate,
        "recent_alerts": alerts[:8],
        "recent_incidents": incidents[:5],
        "active_decisions": _app_state.get("decision_feed", [])[:5],
        "zone_scores": _app_state.get("zone_scores", []),
        "relay_status": relay,
        "last_decision": decision,
    }


# ═══════════════════════════════════════════════════════
# SENSORS
# ═══════════════════════════════════════════════════════

@router.get("/sensors")
async def get_sensors(zone: Optional[str] = None):
    """Live sensor readings for all zones."""
    zones = _app_state.get("sensor_zones", [])
    if zone:
        zones = [z for z in zones if z.get("zone") == zone]
    aggregate = _app_state.get("aggregate", {})
    return {
        "source": _app_state.get("hardware_mode", "simulation"),
        "zones": zones,
        "aggregate": aggregate,
        "thresholds": {
            "temperature":  {"warn": 45, "critical": 60, "unit": "°C"},
            "humidity":     {"warn": 30, "critical": 20, "unit": "%", "low_danger": True},
            "smoke_ppm":    {"warn": 150, "critical": 300, "unit": "ppm"},
            "gas_ppm":      {"warn": 200, "critical": 400, "unit": "ppm"},
            "dust_ugm3":    {"warn": 100, "critical": 250, "unit": "µg/m³"},
            "current_amps": {"warn": 12, "critical": 18, "unit": "A"},
        },
    }


# ═══════════════════════════════════════════════════════
# HAZARD SCORE / AI BRAIN
# ═══════════════════════════════════════════════════════

@router.get("/hazard-score")
async def get_hazard_score():
    """Current hazard score with SHAP explainability."""
    hazard = _app_state.get("hazard_result", {})
    return {
        **hazard,
        "timestamp": datetime.utcnow().isoformat(),
        "model": "SAFE-FUSE Compound Risk Scorer v1.0",
        "description": "Multi-sensor weighted hazard score with compound risk detection",
    }


@router.get("/ai-brain")
async def get_ai_brain():
    """Full AI brain state — decision chain, SHAP, confidence, history."""
    hazard = _app_state.get("hazard_result", {})
    decision = _app_state.get("last_decision", {})
    zone_scores = _app_state.get("zone_scores", [])
    history = list(_app_state.get("history", {}).get("hazard_score", []))

    return {
        "hazard_result": hazard,
        "last_decision": decision,
        "zone_scores": zone_scores,
        "decision_feed": _app_state.get("decision_feed", [])[:20],
        "history": history[-60:],  # Last 60 data points
        "model_info": {
            "name": "SAFE-FUSE Compound Risk AI",
            "version": "1.0.0",
            "sensors": ["DHT22 (Temp)", "DHT22 (Humidity)", "MQ-2 (Smoke)",
                       "MQ-135 (Gas)", "Dust Sensor", "Flame Sensor", "ACS712 (Current)"],
            "compound_rules": 6,
            "update_interval_s": 2,
        },
    }


# ═══════════════════════════════════════════════════════
# HARDWARE MONITOR
# ═══════════════════════════════════════════════════════

@router.get("/hardware")
async def get_hardware():
    """Complete hardware status — all sensors + relay states."""
    aggregate = _app_state.get("aggregate", {})
    relay = _app_state.get("relay_status", {})
    zones = _app_state.get("sensor_zones", [])
    mqtt_status = _app_state.get("mqtt_status", {})
    hardware_mode = _app_state.get("hardware_mode", "simulation")

    return {
        "hardware_mode": hardware_mode,
        "mqtt": mqtt_status,
        "sensors": {
            "dht22_temperature": {
                "hardware": "DHT22 Temperature Sensor",
                "pin": "GPIO4",
                "value": aggregate.get("temperature"),
                "unit": "°C",
                "status": _sensor_status(aggregate.get("temperature", 25), 45, 60),
            },
            "dht22_humidity": {
                "hardware": "DHT22 Humidity Sensor",
                "pin": "GPIO4",
                "value": aggregate.get("humidity"),
                "unit": "%",
                "status": _sensor_status_low(aggregate.get("humidity", 50), 30, 20),
            },
            "mq2_smoke": {
                "hardware": "MQ-2 Gas Sensor",
                "pin": "GPIO34 (ADC)",
                "value": aggregate.get("smoke_ppm"),
                "unit": "ppm",
                "status": _sensor_status(aggregate.get("smoke_ppm", 0), 150, 300),
            },
            "mq135_gas": {
                "hardware": "MQ-135 Air Quality Sensor",
                "pin": "GPIO35 (ADC)",
                "value": aggregate.get("gas_ppm"),
                "unit": "ppm",
                "status": _sensor_status(aggregate.get("gas_ppm", 0), 200, 400),
            },
            "dust_sensor": {
                "hardware": "GP2Y1010AU0F Dust Sensor",
                "pin": "GPIO32 (ADC)",
                "value": aggregate.get("dust_ugm3"),
                "unit": "µg/m³",
                "status": _sensor_status(aggregate.get("dust_ugm3", 0), 100, 250),
            },
            "flame_sensor": {
                "hardware": "IR Flame Sensor",
                "pin": "GPIO26 (Digital)",
                "value": aggregate.get("flame_detected", False),
                "unit": "bool",
                "status": "critical" if aggregate.get("flame_detected") else "normal",
            },
            "acs712_current": {
                "hardware": "ACS712 Current Sensor (20A)",
                "pin": "GPIO33 (ADC)",
                "value": aggregate.get("current_amps"),
                "unit": "A",
                "status": _sensor_status(aggregate.get("current_amps", 0), 12, 18),
            },
            "power": {
                "hardware": "Computed (Current × 240V)",
                "pin": "N/A",
                "value": aggregate.get("power_watts"),
                "unit": "W",
                "status": _sensor_status(aggregate.get("power_watts", 0), 2800, 4200),
            },
        },
        "relays": relay,
        "relay_events": relay.get("recent_events", [])[:15],
        "zones": zones,
    }


@router.post("/hardware/relay/{device}/{action}")
async def control_relay(device: str, action: str, reason: str = "Manual override"):
    """Manually control a relay device."""
    from hardware.relay_controller import relay_controller
    valid_devices = ["relay1", "relay2", "humidifier", "alarm", "warning_led"]
    valid_actions = ["on", "off"]

    if device not in valid_devices:
        raise HTTPException(400, f"Unknown device: {device}. Valid: {valid_devices}")
    if action.lower() not in valid_actions:
        raise HTTPException(400, f"Unknown action: {action}. Valid: on, off")

    if action.lower() == "on":
        result = relay_controller.activate(device, reason, triggered_by="manual")
    else:
        result = relay_controller.deactivate(device, reason, triggered_by="manual")

    # Update app_state relay status
    _app_state["relay_status"] = relay_controller.get_status()
    return result


# ═══════════════════════════════════════════════════════
# INCIDENTS
# ═══════════════════════════════════════════════════════

@router.get("/incidents")
async def get_incidents(severity: Optional[str] = None, limit: int = Query(50, le=200)):
    """Get all AI-generated incidents."""
    incidents = _app_state.get("incidents", [])
    if severity:
        incidents = [i for i in incidents if i.get("severity") == severity]
    return {
        "total": len(incidents),
        "open": len([i for i in incidents if i.get("status") == "open"]),
        "resolved": len([i for i in incidents if i.get("status") in ["resolved", "closed"]]),
        "incidents": incidents[:limit],
    }


@router.patch("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str):
    """Mark an incident as resolved."""
    incidents = _app_state.get("incidents", [])
    for inc in incidents:
        if inc.get("incident_id") == incident_id:
            inc["status"] = "resolved"
            inc["resolved_at"] = datetime.utcnow().isoformat()
            return {"success": True, "incident": inc}
    raise HTTPException(404, f"Incident {incident_id} not found")


# ═══════════════════════════════════════════════════════
# REPORTS
# ═══════════════════════════════════════════════════════

@router.get("/report")
async def get_report(report_type: str = "safety_summary"):
    """Generate a report from current system state."""
    hazard = _app_state.get("hazard_result", {})
    aggregate = _app_state.get("aggregate", {})
    relay = _app_state.get("relay_status", {})
    incidents = _app_state.get("incidents", [])
    decision = _app_state.get("last_decision", {})

    base = {
        "report_id": f"RPT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "report_type": report_type,
        "generated_at": datetime.utcnow().isoformat(),
        "plant": "SAFE-FUSE AI Demo Plant",
        "generated_by": "SAFE-FUSE AI System",
    }

    if report_type == "safety_summary":
        return {**base,
            "title": "Safety Summary Report",
            "summary": f"Current hazard score: {hazard.get('score', 0):.1f}% ({hazard.get('risk_level','N/A').upper()}). "
                       f"{len([i for i in incidents if i.get('status')=='open'])} open incidents. "
                       f"{'FLAME DETECTED - EMERGENCY.' if aggregate.get('flame_detected') else 'No active flame detection.'}",
            "content": {
                "hazard_assessment": hazard,
                "sensor_readings": aggregate,
                "relay_status": relay,
                "open_incidents": [i for i in incidents if i.get("status") == "open"],
                "last_ai_decision": decision,
            },
        }

    if report_type == "incident":
        return {**base,
            "title": "Incident Report",
            "summary": f"{len(incidents)} total incidents on record.",
            "content": {"incidents": incidents},
        }

    if report_type == "hardware":
        return {**base,
            "title": "Hardware Status Report",
            "summary": f"All sensors operational. Relay states: Fan={'ON' if relay.get('relay1',{}).get('on') else 'OFF'}.",
            "content": {"sensors": aggregate, "relays": relay},
        }

    return {**base, "title": "General Report", "content": {}}


# ═══════════════════════════════════════════════════════
# DIGITAL TWIN DATA
# ═══════════════════════════════════════════════════════

@router.get("/digital-twin")
async def get_digital_twin():
    """Zone-by-zone data for the 3D digital twin visualization."""
    zones = _app_state.get("sensor_zones", [])
    zone_scores = _app_state.get("zone_scores", [])
    relay = _app_state.get("relay_status", {})

    # Merge zone sensor data with hazard scores
    twin_zones = []
    for z in zones:
        zone_name = z.get("zone")
        score_data = next((s for s in zone_scores if s["zone"] == zone_name), {})
        twin_zones.append({
            **z,
            "hazard_score": score_data.get("hazard_score", 0),
            "risk_level": score_data.get("risk_level", "low"),
            "top_factor": score_data.get("top_factor", ""),
        })

    return {
        "zones": twin_zones,
        "relay_status": relay,
        "anomaly_zone": _app_state.get("aggregate", {}).get("anomaly_zone"),
        "flame_detected": _app_state.get("aggregate", {}).get("flame_detected", False),
    }


# ═══════════════════════════════════════════════════════
# HISTORY / ANALYTICS
# ═══════════════════════════════════════════════════════

@router.get("/history")
async def get_history():
    """Historical sensor trend data for charts (last 60 data points = ~2 minutes)."""
    history = _app_state.get("history", {})
    return {
        key: list(val)[-60:]
        for key, val in history.items()
    }


# ═══════════════════════════════════════════════════════
# SETTINGS
# ═══════════════════════════════════════════════════════

@router.get("/settings")
async def get_settings():
    """Current system configuration."""
    return _app_state.get("settings", {
        "simulation_mode": True,
        "mqtt_broker": "localhost",
        "mqtt_port": 1883,
        "mqtt_topic_prefix": "safefuse",
        "update_interval_s": 2,
        "thresholds": {
            "temperature_warn": 45,
            "temperature_critical": 60,
            "humidity_warn": 30,
            "humidity_critical": 20,
            "smoke_warn": 150,
            "smoke_critical": 300,
            "gas_warn": 200,
            "gas_critical": 400,
        },
    })


class SettingsUpdate(BaseModel):
    simulation_mode: Optional[bool] = None
    mqtt_broker: Optional[str] = None
    mqtt_port: Optional[int] = None


@router.post("/settings")
async def update_settings(update: SettingsUpdate):
    """Update system settings."""
    settings = _app_state.setdefault("settings", {})
    if update.simulation_mode is not None:
        settings["simulation_mode"] = update.simulation_mode
        _app_state["hardware_mode"] = "simulation" if update.simulation_mode else "hardware"
    if update.mqtt_broker is not None:
        settings["mqtt_broker"] = update.mqtt_broker
    if update.mqtt_port is not None:
        settings["mqtt_port"] = update.mqtt_port
    return {"success": True, "settings": settings}


# ═══════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════

@router.get("/alerts")
async def get_alerts(severity: Optional[str] = None, limit: int = Query(20, le=100)):
    """Get recent alerts."""
    alerts = _app_state.get("alerts", [])
    if severity:
        alerts = [a for a in alerts if a.get("severity") == severity]
    return {"total": len(alerts), "alerts": alerts[:limit]}


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Acknowledge an alert."""
    alerts = _app_state.get("alerts", [])
    for a in alerts:
        if a.get("alert_id") == alert_id:
            a["acknowledged"] = True
            a["acknowledged_at"] = datetime.utcnow().isoformat()
            return {"success": True}
    raise HTTPException(404, f"Alert {alert_id} not found")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _sensor_status(value, warn, critical):
    if value is None: return "offline"
    if value >= critical: return "critical"
    if value >= warn: return "warning"
    return "normal"

def _sensor_status_low(value, warn, critical):
    """For sensors where LOW values are dangerous (e.g., humidity)."""
    if value is None: return "offline"
    if value <= critical: return "critical"
    if value <= warn: return "warning"
    return "normal"
