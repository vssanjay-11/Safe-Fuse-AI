"""
SAFE-FUSE AI — Agentic Decision Engine
The AI "safety supervisor" that:
1. Reads hazard scores from all zones
2. Reasons about compound risks
3. Decides and executes mitigation actions
4. Generates incident reports and notifications
5. Provides a full decision chain log (explainable agentic AI)

Decision Flow:
  HazardScore → Risk Assessment → Action Selection → Execution → Logging
"""

import uuid
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import deque


class AgenticDecisionEngine:
    """
    Autonomous safety supervisor AI.
    Behaves like a trained safety engineer who can observe, reason, and act.
    """

    # Risk thresholds for each action type
    ACTION_THRESHOLDS = {
        "cooling_fan": 35,       # Score > 35 → activate cooling fan
        "exhaust_fan": 40,       # Score > 40 → activate exhaust fan
        "humidifier": 30,        # Score > 30 (when humidity low) → humidifier
        "alarm": 60,             # Score > 60 → trigger alarm
        "warning_led": 25,       # Score > 25 → warning LED
        "evacuation_alert": 80,  # Score > 80 → evacuation alert
    }

    def __init__(self):
        self.decision_history = deque(maxlen=200)
        self.incident_log: List[Dict] = self._get_initial_mock_incidents()
        self.cycle_count = 0
        self.last_decision: Optional[Dict] = None
        self._active_mitigations: Dict[str, bool] = {}

    def _get_initial_mock_incidents(self) -> List[Dict]:
        """Pre-populate realistic mock safety incidents for demo & visualization."""
        now = datetime.utcnow()
        return [
            {
                "incident_id": "INC-8A91B2CF",
                "timestamp": (now).isoformat(),
                "title": "🚨 CRITICAL: Active Fire / Ignition Detected",
                "incident_type": "fire",
                "severity": "critical",
                "hazard_score": 88.5,
                "zone": "Mixing Room",
                "status": "open",
                "sensor_snapshot": {
                    "temperature": 58.2,
                    "humidity": 18.5,
                    "smoke_ppm": 340.0,
                    "gas_ppm": 420.0,
                    "dust_ugm3": 180.0,
                    "flame_detected": True,
                    "current_amps": 15.4,
                },
                "triggered_rules": [
                    {"id": "FLAME_GAS", "label": "Open Flame + Gas Present", "bonus": 40},
                    {"id": "IGNITION_RISK", "label": "Ignition Risk Compound", "bonus": 25}
                ],
                "ai_reasoning": "STEP 1 [ASSESS]: Overall Hazard Score 88.5% (CRITICAL) → STEP 2 [ANALYZE]: Flame Sensor DETECTED + Gas 420ppm → STEP 3 [COMPOUND]: Open Flame + Gas Present rule triggered → STEP 4 [ESCALATE]: Immediate emergency protocol initiated.",
                "actions_taken": ["Activate Exhaust Fan", "Trigger Alarm / Buzzer", "Activate Warning LED", "⚠️ EVACUATION ALERT"],
                "reported_by": "SAFE-FUSE AI",
            },
            {
                "incident_id": "INC-7C34D9E0",
                "timestamp": (now).isoformat(),
                "title": "⚠️ HIGH: Dust Explosion Risk Detected",
                "incident_type": "dust_explosion",
                "severity": "high",
                "hazard_score": 72.0,
                "zone": "Storage Vault",
                "status": "open",
                "sensor_snapshot": {
                    "temperature": 44.0,
                    "humidity": 24.0,
                    "smoke_ppm": 160.0,
                    "gas_ppm": 210.0,
                    "dust_ugm3": 280.0,
                    "flame_detected": False,
                    "current_amps": 8.2,
                },
                "triggered_rules": [
                    {"id": "DUST_EXPLOSION", "label": "Dust Explosion Potential", "bonus": 30}
                ],
                "ai_reasoning": "STEP 1 [ASSESS]: Hazard Score 72.0% (HIGH) → STEP 2 [ANALYZE]: High dust density (280µg/m³) + low humidity (24%) → STEP 3 [COMPOUND]: Dust Explosion Potential triggered → STEP 4 [ACTION]: Exhaust fan & humidifier activated.",
                "actions_taken": ["Activate Exhaust Fan", "Activate Humidifier", "Activate Warning LED"],
                "reported_by": "SAFE-FUSE AI",
            },
            {
                "incident_id": "INC-6E12A4B8",
                "timestamp": (now).isoformat(),
                "title": "⚠️ HIGH: Hazardous Gas Concentration Alert",
                "incident_type": "gas_leak",
                "severity": "high",
                "hazard_score": 64.5,
                "zone": "Chemical Plant Zone 3",
                "status": "resolved",
                "sensor_snapshot": {
                    "temperature": 38.5,
                    "humidity": 45.0,
                    "smoke_ppm": 110.0,
                    "gas_ppm": 380.0,
                    "dust_ugm3": 45.0,
                    "flame_detected": False,
                    "current_amps": 6.0,
                },
                "triggered_rules": [
                    {"id": "CHEMICAL_RELEASE", "label": "Chemical Release Detected", "bonus": 20}
                ],
                "ai_reasoning": "STEP 1 [ASSESS]: Hazard Score 64.5% (HIGH) → STEP 2 [ANALYZE]: Gas concentration spike (380ppm MQ-135) → STEP 3 [ACTION]: Exhaust ventilation initiated until gas levels normalized.",
                "actions_taken": ["Activate Exhaust Fan"],
                "reported_by": "SAFE-FUSE AI",
            },
            {
                "incident_id": "INC-4F56E7D8",
                "timestamp": (now).isoformat(),
                "title": "Electrical Overload Warning",
                "incident_type": "electrical",
                "severity": "medium",
                "hazard_score": 48.0,
                "zone": "Electrical Room",
                "status": "resolved",
                "sensor_snapshot": {
                    "temperature": 49.0,
                    "humidity": 28.0,
                    "smoke_ppm": 85.0,
                    "gas_ppm": 120.0,
                    "dust_ugm3": 30.0,
                    "flame_detected": False,
                    "current_amps": 16.8,
                },
                "triggered_rules": [
                    {"id": "ELECTRICAL_HAZARD", "label": "Electrical Overload + Humidity", "bonus": 15}
                ],
                "ai_reasoning": "STEP 1 [ASSESS]: Hazard Score 48.0% (MEDIUM) → STEP 2 [ANALYZE]: Current 16.8A exceeding safe threshold (12A) → STEP 3 [ACTION]: Cooling fan enabled to prevent electrical fire.",
                "actions_taken": ["Activate Cooling Fan"],
                "reported_by": "SAFE-FUSE AI",
            }
        ]

    def process(
        self,
        aggregate: Dict[str, Any],
        zone_scores: List[Dict],
        hazard_result: Dict[str, Any],
        relay_status: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Main decision cycle. Called every 2 seconds.

        Returns complete decision with:
        - reasoning chain
        - decided actions
        - executed mitigations
        - current confidence
        """
        start = time.time()
        self.cycle_count += 1

        score = hazard_result.get("score", 0)
        risk_level = hazard_result.get("risk_level", "low")
        triggered_rules = hazard_result.get("triggered_rules", [])
        shap_values = hazard_result.get("shap_values", [])

        # ─── Step 1: Observe ──────────────────────────────────────────
        observations = self._observe(aggregate, zone_scores, hazard_result)

        # ─── Step 2: Reason ───────────────────────────────────────────
        reasoning_chain = self._reason(
            score, risk_level, triggered_rules, shap_values, observations
        )

        # ─── Step 3: Decide Actions ────────────────────────────────────
        decided_actions = self._decide(
            score, risk_level, aggregate, triggered_rules, relay_status
        )

        # ─── Step 4: Check if incident should be logged ───────────────
        incident = None
        if score >= 60 and not self._recent_incident_exists(zone_scores):
            incident = self._create_incident(
                score, risk_level, aggregate, zone_scores,
                triggered_rules, reasoning_chain, decided_actions
            )
            self.incident_log.insert(0, incident)
            if len(self.incident_log) > 50:
                self.incident_log.pop()

        # ─── Step 5: Build decision record ────────────────────────────
        processing_ms = round((time.time() - start) * 1000, 2)

        decision = {
            "decision_id": f"DEC-{self.cycle_count:06d}",
            "timestamp": datetime.utcnow().isoformat(),
            "cycle": self.cycle_count,
            "hazard_score": score,
            "risk_level": risk_level,
            "confidence": hazard_result.get("confidence", 85),
            "observations": observations,
            "reasoning_chain": reasoning_chain,
            "decided_actions": decided_actions,
            "triggered_rules": triggered_rules,
            "top_shap_factors": shap_values[:5],
            "incident_created": incident is not None,
            "incident_id": incident["incident_id"] if incident else None,
            "processing_ms": processing_ms,
        }

        self.decision_history.appendleft(decision)
        self.last_decision = decision
        return decision

    def _observe(self, aggregate, zone_scores, hazard_result) -> List[str]:
        """Generate structured observations from sensor state."""
        obs = []

        temp = aggregate.get("temperature", 0)
        hum = aggregate.get("humidity", 100)
        gas = aggregate.get("gas_ppm", 0)
        smoke = aggregate.get("smoke_ppm", 0)
        dust = aggregate.get("dust_ugm3", 0)
        flame = aggregate.get("flame_detected", False)
        current = aggregate.get("current_amps", 0)

        # Temperature
        if temp > 55:
            obs.append(f"🌡️ Temperature critically elevated ({temp}°C) — above safe limit of 40°C")
        elif temp > 42:
            obs.append(f"🌡️ Temperature elevated ({temp}°C) — approaching danger threshold")

        # Humidity
        if hum < 20:
            obs.append(f"💧 Humidity critically low ({hum}%) — extreme static discharge and fire acceleration risk")
        elif hum < 35:
            obs.append(f"💧 Humidity below safe level ({hum}%) — conditions favor rapid fire spread")

        # Gas / Air Quality
        if gas > 400:
            obs.append(f"⚗️ CRITICAL: Gas concentration at {gas:.0f}ppm — explosive range approaching")
        elif gas > 200:
            obs.append(f"⚗️ Elevated gas levels detected ({gas:.0f}ppm) — ventilation required")

        # Smoke
        if smoke > 300:
            obs.append(f"💨 Heavy smoke detected ({smoke:.0f}ppm) — active combustion suspected")
        elif smoke > 150:
            obs.append(f"💨 Smoke levels elevated ({smoke:.0f}ppm) — potential smoldering")

        # Dust
        if dust > 250:
            obs.append(f"🌫️ Dust density at {dust:.0f}µg/m³ — dust explosion potential is HIGH")
        elif dust > 100:
            obs.append(f"🌫️ Elevated dust concentration ({dust:.0f}µg/m³)")

        # Flame
        if flame:
            obs.append("🔥 FLAME DETECTED — active ignition source confirmed")

        # Current
        if current > 18:
            obs.append(f"⚡ Current overload detected ({current:.1f}A) — electrical fire risk")
        elif current > 12:
            obs.append(f"⚡ Current above normal ({current:.1f}A) — monitor electrical systems")

        # Zone-specific
        critical_zones = [z for z in zone_scores if z["risk_level"] == "critical"]
        if critical_zones:
            zone_names = [z["zone"] for z in critical_zones]
            obs.append(f"🏭 Critical conditions in zones: {', '.join(zone_names)}")

        if not obs:
            obs.append("✅ All parameters within safe operating limits")

        return obs

    def _reason(self, score, risk_level, triggered_rules, shap_values, observations) -> List[str]:
        """Generate step-by-step reasoning chain."""
        chain = []

        chain.append(f"STEP 1 [ASSESS]: Overall Hazard Score computed at {score:.1f}% — classified as {risk_level.upper()} risk.")

        if shap_values:
            top = shap_values[0]
            chain.append(
                f"STEP 2 [ANALYZE]: Primary risk driver is {top['sensor']} "
                f"(value: {top['value']}{top['unit']}, contributing {top['contribution']:.1f}% to hazard score)."
            )
            if len(shap_values) > 1:
                second = shap_values[1]
                chain.append(
                    f"STEP 2b [ANALYZE]: Secondary driver is {second['sensor']} "
                    f"(contribution: {second['contribution']:.1f}%)."
                )

        if triggered_rules:
            for rule in triggered_rules:
                chain.append(
                    f"STEP 3 [COMPOUND]: Rule '{rule['label']}' triggered — "
                    f"{rule['description']} (bonus score: +{rule['bonus']})"
                )
        else:
            chain.append("STEP 3 [COMPOUND]: No compound hazard rules triggered. Evaluating individual sensor risk.")

        if risk_level == "critical":
            chain.append("STEP 4 [ESCALATE]: CRITICAL threshold breached. Emergency response protocols initiated.")
            chain.append("STEP 4b [ESCALATE]: Supervisor notification and evacuation alert queued.")
        elif risk_level == "high":
            chain.append("STEP 4 [ESCALATE]: HIGH risk threshold reached. Automated mitigation sequence starting.")
        elif risk_level == "medium":
            chain.append("STEP 4 [MONITOR]: MEDIUM risk. Preventive mitigations activated, continuing enhanced monitoring.")
        else:
            chain.append("STEP 4 [MONITOR]: LOW risk. No mitigation required. Standard monitoring continues.")

        return chain

    def _decide(
        self, score, risk_level, aggregate, triggered_rules, relay_status
    ) -> List[Dict]:
        """Determine which actions to take based on risk assessment."""
        actions = []
        hum = aggregate.get("humidity", 100)
        flame = aggregate.get("flame_detected", False)
        gas = aggregate.get("gas_ppm", 0)
        temp = aggregate.get("temperature", 0)
        current = aggregate.get("current_amps", 0)

        # Cooling Fan (Relay 1)
        if score >= self.ACTION_THRESHOLDS["cooling_fan"] or temp > 42:
            actions.append({
                "device": "relay1",
                "action": "ON",
                "label": "Activate Cooling Fan",
                "reason": f"Temperature at {temp}°C with hazard score {score:.0f}% — cooling required",
                "priority": 1,
            })
        elif score < 20 and relay_status.get("relay1", {}).get("on"):
            actions.append({
                "device": "relay1",
                "action": "OFF",
                "label": "Deactivate Cooling Fan",
                "reason": "Hazard score normalized — cooling no longer required",
                "priority": 3,
            })

        # Exhaust Fan (Relay 2)
        if gas > 200 or score >= self.ACTION_THRESHOLDS["exhaust_fan"]:
            actions.append({
                "device": "relay2",
                "action": "ON",
                "label": "Activate Exhaust Fan",
                "reason": f"Gas at {gas:.0f}ppm — exhaust ventilation required",
                "priority": 1,
            })
        elif gas < 100 and score < 25 and relay_status.get("relay2", {}).get("on"):
            actions.append({
                "device": "relay2",
                "action": "OFF",
                "label": "Deactivate Exhaust Fan",
                "reason": "Gas levels normalized",
                "priority": 3,
            })

        # Humidifier
        if hum < 35 and score >= self.ACTION_THRESHOLDS["humidifier"]:
            actions.append({
                "device": "humidifier",
                "action": "ON",
                "label": "Activate Humidifier",
                "reason": f"Humidity at {hum}% — low humidity increases ignition risk",
                "priority": 2,
            })
        elif hum > 55 and relay_status.get("humidifier", {}).get("on"):
            actions.append({
                "device": "humidifier",
                "action": "OFF",
                "label": "Deactivate Humidifier",
                "reason": "Humidity restored to safe level",
                "priority": 3,
            })

        # Alarm
        if score >= self.ACTION_THRESHOLDS["alarm"] or flame:
            actions.append({
                "device": "alarm",
                "action": "ON",
                "label": "Trigger Alarm / Buzzer",
                "reason": f"{'Flame detected!' if flame else f'Hazard score {score:.0f}% exceeds alarm threshold'}",
                "priority": 1,
            })
        elif score < 40 and not flame and relay_status.get("alarm", {}).get("on"):
            actions.append({
                "device": "alarm",
                "action": "OFF",
                "label": "Silence Alarm",
                "reason": "Conditions normalized — alarm silenced",
                "priority": 3,
            })

        # Warning LED
        if score >= self.ACTION_THRESHOLDS["warning_led"]:
            actions.append({
                "device": "warning_led",
                "action": "ON",
                "label": "Activate Warning LED",
                "reason": f"Visual warning activated — hazard score {score:.0f}%",
                "priority": 2,
            })
        elif score < 15 and relay_status.get("warning_led", {}).get("on"):
            actions.append({
                "device": "warning_led",
                "action": "OFF",
                "label": "Deactivate Warning LED",
                "reason": "Conditions safe — LED deactivated",
                "priority": 3,
            })

        # Evacuation Alert
        if score >= self.ACTION_THRESHOLDS["evacuation_alert"]:
            actions.append({
                "device": "evacuation",
                "action": "ALERT",
                "label": "⚠️ EVACUATION ALERT",
                "reason": f"Hazard score {score:.0f}% exceeds evacuation threshold (80%) — immediate evacuation recommended",
                "priority": 0,
            })

        # Sort by priority
        actions.sort(key=lambda x: x["priority"])
        return actions

    def _recent_incident_exists(self, zone_scores: List[Dict], window_seconds: int = 60) -> bool:
        """Avoid duplicate incident creation within the last 60 seconds."""
        if not self.incident_log:
            return False
        try:
            last = datetime.fromisoformat(self.incident_log[0]["timestamp"])
            elapsed = (datetime.utcnow() - last).total_seconds()
            return elapsed < window_seconds
        except Exception:
            return False

    def _create_incident(
        self, score, risk_level, aggregate, zone_scores,
        triggered_rules, reasoning_chain, decided_actions
    ) -> Dict:
        """Auto-generate an incident record when hazard score is high."""
        most_critical_zone = max(zone_scores, key=lambda z: z["hazard_score"], default=None)
        incident_type = self._classify_incident_type(aggregate, triggered_rules)

        return {
            "incident_id": f"INC-{uuid.uuid4().hex[:8].upper()}",
            "timestamp": datetime.utcnow().isoformat(),
            "title": self._incident_title(incident_type, risk_level),
            "incident_type": incident_type,
            "severity": risk_level,
            "hazard_score": score,
            "zone": most_critical_zone["zone"] if most_critical_zone else "Multiple Zones",
            "status": "open",
            "sensor_snapshot": {
                "temperature": aggregate.get("temperature"),
                "humidity": aggregate.get("humidity"),
                "smoke_ppm": aggregate.get("smoke_ppm"),
                "gas_ppm": aggregate.get("gas_ppm"),
                "dust_ugm3": aggregate.get("dust_ugm3"),
                "flame_detected": aggregate.get("flame_detected"),
                "current_amps": aggregate.get("current_amps"),
            },
            "triggered_rules": triggered_rules,
            "ai_reasoning": " → ".join(reasoning_chain[:3]),
            "actions_taken": [a["label"] for a in decided_actions],
            "reported_by": "SAFE-FUSE AI",
        }

    def _classify_incident_type(self, aggregate, triggered_rules) -> str:
        rule_ids = {r["id"] for r in triggered_rules}
        if "FLAME_GAS" in rule_ids or aggregate.get("flame_detected"):
            return "fire"
        if "DUST_EXPLOSION" in rule_ids:
            return "dust_explosion"
        if "IGNITION_RISK" in rule_ids or "FIRE_TRIANGLE" in rule_ids:
            return "ignition_risk"
        if "ELECTRICAL_HAZARD" in rule_ids:
            return "electrical"
        if aggregate.get("gas_ppm", 0) > 300:
            return "gas_leak"
        return "general_hazard"

    def _incident_title(self, incident_type, risk_level) -> str:
        titles = {
            "fire": "Active Fire / Ignition Detected",
            "dust_explosion": "Dust Explosion Risk Detected",
            "ignition_risk": "Critical Ignition Risk — Multi-Factor",
            "gas_leak": "Hazardous Gas Concentration Alert",
            "electrical": "Electrical Overload Warning",
            "general_hazard": "Multi-Sensor Hazard Alert",
        }
        prefix = "🚨 CRITICAL: " if risk_level == "critical" else "⚠️ HIGH: " if risk_level == "high" else ""
        return prefix + titles.get(incident_type, "Safety Hazard Detected")

    def get_decision_feed(self, limit: int = 20) -> List[Dict]:
        return list(self.decision_history)[:limit]

    def get_incidents(self) -> List[Dict]:
        return self.incident_log


# Singleton
agentic_engine = AgenticDecisionEngine()
