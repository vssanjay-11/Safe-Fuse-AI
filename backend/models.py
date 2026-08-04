"""
SAFE-FUSE AI — Database Models
SQLAlchemy ORM models for persistent data.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, unique=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    incident_type = Column(String)          # fire, gas_leak, explosion_risk, dust_hazard, electrical
    severity = Column(String)               # low, medium, high, critical
    zone = Column(String)
    status = Column(String, default="open") # open, investigating, resolved, closed
    hazard_score = Column(Float, default=0)
    sensor_snapshot = Column(JSON)          # sensor values at time of incident
    ai_reasoning = Column(Text)
    action_taken = Column(Text)
    root_cause = Column(String)
    corrective_action = Column(Text)
    reported_by = Column(String, default="AI System")
    timestamp = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class SensorLog(Base):
    __tablename__ = "sensor_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    temperature = Column(Float)
    humidity = Column(Float)
    smoke_ppm = Column(Float)
    gas_ppm = Column(Float)
    dust_ugm3 = Column(Float)
    flame_detected = Column(Boolean, default=False)
    current_amps = Column(Float)
    power_watts = Column(Float)
    hazard_score = Column(Float)
    risk_level = Column(String)
    source = Column(String, default="simulation")  # "hardware" or "simulation"


class RelayEvent(Base):
    __tablename__ = "relay_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    relay_id = Column(String)               # relay1, relay2, fan, humidifier, alarm
    action = Column(String)                 # ON, OFF
    triggered_by = Column(String)           # "AI", "manual", "threshold"
    reason = Column(Text)
    hazard_score_at_trigger = Column(Float)


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    alert_id = Column(String, unique=True)
    title = Column(String)
    message = Column(Text)
    severity = Column(String)               # info, warning, critical
    zone = Column(String)
    sensor_type = Column(String)
    value = Column(Float)
    threshold = Column(Float)
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
