"""
SAFE-FUSE AI — Main Application Entry Point
======================================================
Predictive AI-Powered Industrial Safety Intelligence Platform
Predict • Explain • Act • Prevent

Run: uvicorn main:app --reload --host 0.0.0.0 --port 8000

Hardware Mode: Activated automatically when ESP32 publishes via MQTT.
Simulation Mode: Active when no MQTT broker / hardware connected.
"""

import asyncio
import json
import uuid
import random
from datetime import datetime
from contextlib import asynccontextmanager
from collections import deque

import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from database import init_db
from websocket_manager import ws_manager
from hardware.sensor_simulator import sensor_simulator
from hardware.mqtt_bridge import mqtt_bridge
from hardware.relay_controller import relay_controller
from agents.hazard_score_engine import hazard_score_engine
from agents.agentic_decision_engine import agentic_engine
from routes.auth import router as auth_router
from routes.api import router as api_router, set_app_state


# ─── Shared Application State ─────────────────────────────────────────────────
app_state = {
    "hardware_mode": "simulation",       # "simulation" | "hardware"
    "sensor_zones": [],
    "aggregate": {},
    "hazard_result": {},
    "zone_scores": [],
    "last_decision": {},
    "decision_feed": [],
    "relay_status": {},
    "mqtt_status": {},
    "incidents": [],
    "alerts": deque(maxlen=100),
    "history": {
        "hazard_score": deque(maxlen=120),
        "temperature": deque(maxlen=120),
        "humidity": deque(maxlen=120),
        "smoke_ppm": deque(maxlen=120),
        "gas_ppm": deque(maxlen=120),
        "dust_ugm3": deque(maxlen=120),
        "current_amps": deque(maxlen=120),
    },
    "settings": {
        "simulation_mode": True,
        "mqtt_broker": "localhost",
        "mqtt_port": 1883,
        "mqtt_topic_prefix": "safefuse",
        "update_interval_s": 2,
    },
}

# Latest hardware reading (set by MQTT callback)
_latest_hardware_reading = None


def on_hardware_data(reading: dict):
    """Callback when real ESP32 data arrives via MQTT."""
    global _latest_hardware_reading
    _latest_hardware_reading = reading
    app_state["hardware_mode"] = "hardware"
    print(f"[HW] [OK] Hardware data received from ESP32")


# ─── Alert Generator ─────────────────────────────────────────────────────────

def _generate_alerts(aggregate: dict, hazard: dict, zone_scores: list) -> list:
    """Generate structured alert objects from sensor state."""
    new_alerts = []

    checks = [
        ("temperature", aggregate.get("temperature", 0), 45, 60, "Temperature Alert", "°C"),
        ("smoke_ppm", aggregate.get("smoke_ppm", 0), 150, 300, "Smoke Alert", "ppm"),
        ("gas_ppm", aggregate.get("gas_ppm", 0), 200, 400, "Gas Concentration Alert", "ppm"),
        ("dust_ugm3", aggregate.get("dust_ugm3", 0), 100, 250, "Dust Density Alert", "µg/m³"),
        ("current_amps", aggregate.get("current_amps", 0), 12, 18, "Electrical Overload", "A"),
    ]

    for sensor, value, warn, crit, title, unit in checks:
        if value >= crit:
            severity = "critical"
        elif value >= warn:
            severity = "warning"
        else:
            continue

        new_alerts.append({
            "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
            "title": title,
            "message": f"{title}: {value}{unit} ({'above' if sensor != 'humidity' else 'below'} {'critical' if severity == 'critical' else 'warning'} threshold)",
            "severity": severity,
            "sensor": sensor,
            "value": value,
            "threshold": crit if severity == "critical" else warn,
            "acknowledged": False,
            "timestamp": datetime.utcnow().isoformat(),
        })

    # Flame alert
    if aggregate.get("flame_detected"):
        new_alerts.append({
            "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
            "title": "[FIRE] FLAME DETECTED",
            "message": "Active flame/ignition source detected by IR flame sensor",
            "severity": "critical",
            "sensor": "flame",
            "value": 1,
            "threshold": 1,
            "acknowledged": False,
            "timestamp": datetime.utcnow().isoformat(),
        })

    # Humidity alert (low danger)
    hum = aggregate.get("humidity", 100)
    if hum <= 20:
        new_alerts.append({
            "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
            "title": "Critically Low Humidity",
            "message": f"Humidity at {hum}% — static discharge and rapid fire spread risk",
            "severity": "critical",
            "sensor": "humidity",
            "value": hum,
            "threshold": 20,
            "acknowledged": False,
            "timestamp": datetime.utcnow().isoformat(),
        })
    elif hum <= 30:
        new_alerts.append({
            "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
            "title": "Low Humidity Warning",
            "message": f"Humidity at {hum}% — below safe threshold of 35%",
            "severity": "warning",
            "sensor": "humidity",
            "value": hum,
            "threshold": 30,
            "acknowledged": False,
            "timestamp": datetime.utcnow().isoformat(),
        })

    return new_alerts


# ─── Main Simulation Loop ─────────────────────────────────────────────────────

async def simulation_loop():
    """
    Core system loop — runs every 2 seconds.
    1. Get sensor data (hardware or simulator)
    2. Run hazard scoring AI
    3. Run agentic decision engine
    4. Execute mitigations
    5. Generate alerts
    6. Update history
    7. Broadcast via WebSocket
    """
    print("[LOOP] [OK] Simulation loop started")

    while True:
        try:
            timestamp = datetime.utcnow().isoformat()

            # ─── 1. Sensor Data ───────────────────────────────────────
            global _latest_hardware_reading
            if _latest_hardware_reading is not None and mqtt_bridge.status.get("hardware_active"):
                raw_data = _latest_hardware_reading
                app_state["hardware_mode"] = "hardware"
            else:
                raw_data = sensor_simulator.get_readings()
                app_state["hardware_mode"] = "simulation"

            zones = raw_data.get("zones", [])
            aggregate = raw_data.get("aggregate", {})
            app_state["sensor_zones"] = zones
            app_state["aggregate"] = aggregate

            # ─── 2. Hazard Scoring ────────────────────────────────────
            hazard_result = hazard_score_engine.compute(aggregate)
            zone_scores = hazard_score_engine.compute_zone_scores(zones)
            app_state["hazard_result"] = hazard_result
            app_state["zone_scores"] = zone_scores

            # ─── 3. Agentic Decision ──────────────────────────────────
            relay_status = relay_controller.get_status()
            decision = agentic_engine.process(
                aggregate=aggregate,
                zone_scores=zone_scores,
                hazard_result=hazard_result,
                relay_status=relay_status,
            )
            app_state["last_decision"] = decision
            app_state["decision_feed"] = agentic_engine.get_decision_feed(20)

            # ─── 4. Execute Mitigations ───────────────────────────────
            actions_to_execute = decision.get("decided_actions", [])
            if actions_to_execute:
                relay_controller.execute_mitigation(
                    actions_to_execute,
                    hazard_score=hazard_result.get("score", 0),
                )

            relay_status = relay_controller.get_status()
            app_state["relay_status"] = relay_status

            # ─── 5. Alerts ────────────────────────────────────────────
            new_alerts = _generate_alerts(aggregate, hazard_result, zone_scores)
            for alert in new_alerts:
                app_state["alerts"].appendleft(alert)

            # ─── 6. Incidents (from agentic engine) ───────────────────
            if decision.get("incident_created"):
                app_state["incidents"] = agentic_engine.get_incidents()

            # ─── 7. History ───────────────────────────────────────────
            app_state["history"]["hazard_score"].append(
                {"time": timestamp, "value": hazard_result.get("score", 0)}
            )
            app_state["history"]["temperature"].append(
                {"time": timestamp, "value": aggregate.get("temperature", 0)}
            )
            app_state["history"]["humidity"].append(
                {"time": timestamp, "value": aggregate.get("humidity", 0)}
            )
            app_state["history"]["smoke_ppm"].append(
                {"time": timestamp, "value": aggregate.get("smoke_ppm", 0)}
            )
            app_state["history"]["gas_ppm"].append(
                {"time": timestamp, "value": aggregate.get("gas_ppm", 0)}
            )
            app_state["history"]["dust_ugm3"].append(
                {"time": timestamp, "value": aggregate.get("dust_ugm3", 0)}
            )
            app_state["history"]["current_amps"].append(
                {"time": timestamp, "value": aggregate.get("current_amps", 0)}
            )

            # ─── 8. MQTT Status ───────────────────────────────────────
            app_state["mqtt_status"] = mqtt_bridge.status

            # ─── 9. WebSocket Broadcast ───────────────────────────────
            ws_payload = {
                "type": "full_update",
                "timestamp": timestamp,
                "data": {
                    "hardware_mode": app_state["hardware_mode"],
                    "hazard_score": hazard_result.get("score", 0),
                    "risk_level": hazard_result.get("risk_level", "low"),
                    "safety_score": round(100 - hazard_result.get("score", 0), 1),
                    "confidence": hazard_result.get("confidence", 85),
                    "shap_values": hazard_result.get("shap_values", [])[:5],
                    "triggered_rules": hazard_result.get("triggered_rules", []),
                    "aggregate": aggregate,
                    "zone_scores": zone_scores,
                    "relay_status": relay_status,
                    "alerts": new_alerts[:3],
                    "flame_detected": aggregate.get("flame_detected", False),
                    "anomaly_zone": aggregate.get("anomaly_zone"),
                    "reasoning": decision.get("reasoning_chain", [])[:3],
                    "decided_actions": decision.get("decided_actions", [])[:5],
                    "incident_created": decision.get("incident_created", False),
                },
            }

            await ws_manager.broadcast(ws_payload)

        except Exception as e:
            print(f"[LOOP] [ERR] Error: {e}")
            import traceback
            traceback.print_exc()

        await asyncio.sleep(2)


# ─── App Lifespan ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("  SAFE-FUSE AI — Starting Up")
    print("  Predict • Explain • Act • Prevent")
    print("=" * 60)

    # Initialize DB
    init_db()

    # Inject relay controller MQTT bridge
    relay_controller.set_mqtt(mqtt_bridge)

    # Try connecting to MQTT broker (non-blocking, fails gracefully)
    mqtt_bridge.set_data_callback(on_hardware_data)
    mqtt_connected = mqtt_bridge.connect()
    if not mqtt_connected:
        print("[MAIN] [WARN] MQTT not available — running in Simulation Mode")

    # Share state with API routes
    set_app_state(app_state)

    # Start simulation loop
    loop_task = asyncio.create_task(simulation_loop())

    print("[MAIN] [OK] SAFE-FUSE AI is ready!")
    print("[MAIN] [WS] WebSocket: ws://localhost:8000/ws")
    print("[MAIN] [API] API Docs: http://localhost:8000/docs")
    print("=" * 60)

    yield

    # Shutdown
    loop_task.cancel()
    mqtt_bridge.disconnect()
    print("[MAIN] [STOP] SAFE-FUSE AI shutting down...")


# ─── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="SAFE-FUSE AI",
    description="Predictive AI-Powered Industrial Safety Intelligence Platform — Predict • Explain • Act • Prevent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(api_router)


# ─── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time sensor stream — broadcasts every 2 seconds."""
    await ws_manager.connect(websocket)

    # Send immediate state on connect
    try:
        await ws_manager.send_personal(websocket, {
            "type": "connected",
            "message": "Connected to SAFE-FUSE AI real-time stream",
            "hardware_mode": app_state.get("hardware_mode", "simulation"),
            "timestamp": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await ws_manager.send_personal(websocket, {
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat(),
                    })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ─── Static Frontend Serving (Production Single-Service) ──────────────────────
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if not os.path.exists(FRONTEND_DIST):
    FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("auth/") or full_path in ["docs", "openapi.json", "redoc", "ws"]:
            return JSONResponse({"error": "Endpoint not found"}, status_code=404)
        
        target_file = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(target_file):
            return FileResponse(target_file)
        
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        
        return JSONResponse({"error": "Frontend build not found"}, status_code=404)
else:
    @app.get("/")
    async def root():
        return {
            "platform": "SAFE-FUSE AI",
            "tagline": "Predict • Explain • Act • Prevent",
            "version": "1.0.0",
            "status": "operational",
            "mode": app_state.get("hardware_mode", "simulation"),
            "api_docs": "/docs",
            "websocket": "/ws",
        }
