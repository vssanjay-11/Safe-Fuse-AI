"""
SAFE-FUSE AI — Multi-Sensor Hazard Score Engine
Core AI module that computes compound hazard scores from correlated sensor readings.

Instead of simple threshold checks, this engine:
1. Applies weighted sensor contributions
2. Detects dangerous compound conditions (e.g., Gas↑ + Humidity↓ + Dust↑ = Ignition Risk)
3. Produces SHAP-style explainability with top contributing factors
4. Generates a confidence score for each prediction
"""

from typing import Dict, List, Any, Tuple
import math


class HazardScoreEngine:
    """
    Weighted multi-sensor hazard scoring with compound risk detection.
    Designed specifically for fireworks, chemical, and pyrotechnic environments.
    """

    # Sensor weights in overall hazard score (must sum to 1.0)
    SENSOR_WEIGHTS = {
        "temperature":  0.20,   # High temp → direct fire risk
        "humidity":     0.15,   # Low humidity → static discharge, fire acceleration
        "smoke_ppm":    0.20,   # Direct combustion indicator
        "gas_ppm":      0.20,   # Explosive gas risk
        "dust_ugm3":    0.10,   # Dust explosion potential
        "flame":        0.10,   # Direct flame detection
        "current_amps": 0.05,   # Electrical overload
    }

    # Safe operating ranges (min, max)
    SAFE_RANGES = {
        "temperature":  (15.0, 40.0),
        "humidity":     (35.0, 75.0),
        "smoke_ppm":    (0.0, 100.0),
        "gas_ppm":      (0.0, 150.0),
        "dust_ugm3":    (0.0, 75.0),
        "current_amps": (0.0, 10.0),
    }

    # Maximum observed values (for normalization)
    MAX_VALUES = {
        "temperature":  85.0,
        "humidity":     100.0,
        "smoke_ppm":    800.0,
        "gas_ppm":      1000.0,
        "dust_ugm3":    500.0,
        "current_amps": 25.0,
    }

    # Compound risk rules: list of (conditions_fn, label, bonus_score, description)
    # Each condition_fn receives the reading dict and returns True if triggered
    COMPOUND_RULES = [
        {
            "id": "IGNITION_RISK",
            "label": "Ignition Risk Compound",
            "description": "High gas + Low humidity + High temperature → Explosive ignition risk",
            "bonus": 25,
            "condition": lambda r: r["gas_ppm"] > 200 and r["humidity"] < 35 and r["temperature"] > 42,
        },
        {
            "id": "DUST_EXPLOSION",
            "label": "Dust Explosion Potential",
            "description": "High dust + Flame detected + Gas present → Dust explosion risk",
            "bonus": 30,
            "condition": lambda r: r["dust_ugm3"] > 150 and r["flame_detected"] and r["gas_ppm"] > 100,
        },
        {
            "id": "FIRE_TRIANGLE",
            "label": "Fire Triangle Complete",
            "description": "Heat + Fuel (smoke/gas) + Oxygen deficiency reversal → Active fire risk",
            "bonus": 35,
            "condition": lambda r: r["temperature"] > 55 and r["smoke_ppm"] > 200 and r["gas_ppm"] > 300,
        },
        {
            "id": "ELECTRICAL_HAZARD",
            "label": "Electrical Overload + Humidity",
            "description": "High current + Low humidity → Static discharge / electrical fire",
            "bonus": 15,
            "condition": lambda r: r["current_amps"] > 14 and r["humidity"] < 30,
        },
        {
            "id": "CHEMICAL_RELEASE",
            "label": "Chemical Release Detected",
            "description": "High gas + High smoke + Normal/low temperature → Chemical vapor release",
            "bonus": 20,
            "condition": lambda r: r["gas_ppm"] > 350 and r["smoke_ppm"] > 150 and r["temperature"] < 50,
        },
        {
            "id": "FLAME_GAS",
            "label": "Open Flame + Gas Present",
            "description": "Flame detected with elevated gas readings → Immediate explosion risk",
            "bonus": 40,
            "condition": lambda r: r["flame_detected"] and r["gas_ppm"] > 200,
        },
    ]

    def compute(self, reading: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute hazard score from a sensor reading dict.

        reading: {temperature, humidity, smoke_ppm, gas_ppm, dust_ugm3,
                  flame_detected, current_amps, power_watts}

        Returns: {
            score: 0-100,
            risk_level: low|medium|high|critical,
            shap_values: [{sensor, contribution, normalized, direction}],
            triggered_rules: [{id, label, description, bonus}],
            confidence: 0-100,
            reasoning: str,
        }
        """

        # ─── 1. Normalize each sensor to 0-100 danger scale ─────────
        raw_scores = {}
        shap_values = []

        for sensor, weight in self.SENSOR_WEIGHTS.items():
            if sensor == "flame":
                # Boolean → 100 if detected, 0 if not
                danger = 100.0 if reading.get("flame_detected", False) else 0.0
                raw_scores["flame"] = danger
                shap_values.append({
                    "sensor": "Flame Sensor",
                    "sensor_key": "flame",
                    "value": "DETECTED" if reading.get("flame_detected") else "CLEAR",
                    "unit": "",
                    "danger_pct": danger,
                    "contribution": round(danger * weight, 2),
                    "weight": weight,
                    "direction": "danger" if danger > 0 else "safe",
                })
                continue

            value = reading.get(sensor, 0)
            max_val = self.MAX_VALUES.get(sensor, 100)
            safe_min, safe_max = self.SAFE_RANGES.get(sensor, (0, 100))

            if sensor == "humidity":
                # Humidity: danger increases as it DROPS below safe min
                if value >= safe_min:
                    danger = 0.0
                else:
                    danger = min(100.0, ((safe_min - value) / safe_min) * 100)
            else:
                # All other sensors: danger increases as value RISES above safe max
                if value <= safe_max:
                    danger = 0.0
                else:
                    danger = min(100.0, ((value - safe_max) / (max_val - safe_max)) * 100)

            raw_scores[sensor] = danger
            contribution = round(danger * weight, 2)

            shap_values.append({
                "sensor": self._sensor_label(sensor),
                "sensor_key": sensor,
                "value": value,
                "unit": self._sensor_unit(sensor),
                "danger_pct": round(danger, 1),
                "contribution": contribution,
                "weight": weight,
                "direction": "danger" if danger > 50 else ("caution" if danger > 20 else "safe"),
            })

        # ─── 2. Base hazard score (weighted sum) ──────────────────────
        base_score = sum(
            raw_scores.get(s, 0) * w for s, w in self.SENSOR_WEIGHTS.items()
        )
        base_score = min(100.0, max(0.0, base_score))

        # ─── 3. Check compound rules (bonus scores) ───────────────────
        triggered_rules = []
        compound_bonus = 0.0

        for rule in self.COMPOUND_RULES:
            try:
                if rule["condition"](reading):
                    triggered_rules.append({
                        "id": rule["id"],
                        "label": rule["label"],
                        "description": rule["description"],
                        "bonus": rule["bonus"],
                    })
                    compound_bonus += rule["bonus"]
            except (KeyError, TypeError):
                pass

        # Apply compound bonus (capped)
        final_score = min(100.0, base_score + compound_bonus * 0.5)
        final_score = round(final_score, 1)

        # ─── 4. Risk level ─────────────────────────────────────────────
        risk_level = self._risk_level(final_score)

        # ─── 5. Sort SHAP values by contribution (descending) ─────────
        shap_values.sort(key=lambda x: x["contribution"], reverse=True)

        # ─── 6. Confidence score ───────────────────────────────────────
        # Confidence is higher when multiple sensors agree
        sensors_above_threshold = sum(1 for s in raw_scores.values() if s > 30)
        confidence = min(100, 60 + sensors_above_threshold * 8 + len(triggered_rules) * 5)
        if final_score < 15:
            confidence = min(confidence, 90)  # Low-risk predictions slightly lower confidence

        # ─── 7. Generate reasoning ────────────────────────────────────
        reasoning = self._generate_reasoning(
            final_score, risk_level, shap_values, triggered_rules, reading
        )

        return {
            "score": final_score,
            "base_score": round(base_score, 1),
            "compound_bonus": round(compound_bonus * 0.5, 1),
            "risk_level": risk_level,
            "shap_values": shap_values,
            "triggered_rules": triggered_rules,
            "confidence": confidence,
            "reasoning": reasoning,
            "top_factor": shap_values[0]["sensor"] if shap_values else "N/A",
        }

    def compute_zone_scores(self, zones: List[Dict]) -> List[Dict]:
        """Compute hazard scores for each factory zone."""
        results = []
        for zone_data in zones:
            score_result = self.compute(zone_data)
            results.append({
                "zone": zone_data.get("zone", "Unknown"),
                "zone_index": zone_data.get("zone_index", 0),
                "hazard_score": score_result["score"],
                "risk_level": score_result["risk_level"],
                "top_factor": score_result["top_factor"],
                "triggered_rules": score_result["triggered_rules"],
                "confidence": score_result["confidence"],
            })
        return results

    def _risk_level(self, score: float) -> str:
        if score >= 75: return "critical"
        if score >= 50: return "high"
        if score >= 25: return "medium"
        return "low"

    def _sensor_label(self, key: str) -> str:
        labels = {
            "temperature": "Temperature (DHT22)",
            "humidity": "Humidity (DHT22)",
            "smoke_ppm": "Smoke (MQ-2)",
            "gas_ppm": "Gas/Air Quality (MQ-135)",
            "dust_ugm3": "Dust Density",
            "current_amps": "Current (ACS712)",
        }
        return labels.get(key, key.replace("_", " ").title())

    def _sensor_unit(self, key: str) -> str:
        units = {
            "temperature": "°C",
            "humidity": "%",
            "smoke_ppm": "ppm",
            "gas_ppm": "ppm",
            "dust_ugm3": "µg/m³",
            "current_amps": "A",
        }
        return units.get(key, "")

    def _generate_reasoning(
        self, score, risk_level, shap, rules, reading
    ) -> str:
        parts = [f"Hazard score: {score:.1f}% ({risk_level.upper()})."]

        if shap:
            top = shap[0]
            if top["contribution"] > 5:
                parts.append(
                    f"Primary driver: {top['sensor']} ({top['value']}{top['unit']}) "
                    f"contributing {top['contribution']:.1f}% to total risk."
                )

        if rules:
            rule_labels = [r["label"] for r in rules]
            parts.append(f"Compound hazards detected: {'; '.join(rule_labels)}.")

        if reading.get("flame_detected"):
            parts.append("⚠️ FLAME DETECTED — immediate evacuation protocol may be required.")

        if risk_level in ("critical", "high"):
            parts.append("Automated mitigation systems should be activated immediately.")

        return " ".join(parts)


# Singleton
hazard_score_engine = HazardScoreEngine()
