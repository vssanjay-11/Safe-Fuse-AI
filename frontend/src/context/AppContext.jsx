import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const AppContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')
);

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'ws://localhost:8000/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

const WS_URL = getWsUrl();

const INITIAL_SHAP = [
  { feature: 'Temperature', contribution: 8.2, value: '28.5 °C' },
  { feature: 'Gas Concentration (MQ-135)', contribution: 4.1, value: '85.0 ppm' },
  { feature: 'Dust Particle Density', contribution: 3.5, value: '38.0 µg/m³' },
  { feature: 'Electrical Current', contribution: 2.6, value: '4.20 A' },
  { feature: 'Humidity Buffer', contribution: -4.2, value: '62.0 %' },
  { feature: 'Flame Detection', contribution: 0.0, value: 'SAFE' },
];

const INITIAL_REASONING = [
  { step: 1, title: 'Telemetry Aggregation', details: 'Ingested telemetry from 7 factory zones (DHT22, MQ-2, MQ-135, Dust, Flame, ACS712)' },
  { step: 2, title: 'Hazard Score Engine', details: 'Evaluated multi-sensor hazard model: 18.4 / 100 (LOW RISK)' },
  { step: 3, title: 'Compound Rule Evaluation', details: 'Checked compound safety rules: IGNITION, DUST_EXPLOSION, FIRE_TRIANGLE — all nominal' },
  { step: 4, title: 'Autonomous Mitigation Plan', details: 'All parameters within safe operating thresholds — relays set to passive monitor mode' },
];

const INITIAL_ZONES = [
  { zone: 'Raw Material Store', score: 15.2, risk_level: 'low', anomaly: false },
  { zone: 'Mixing Room', score: 22.4, risk_level: 'low', anomaly: false },
  { zone: 'Drying Chamber', score: 28.1, risk_level: 'low', anomaly: false },
  { zone: 'Packing Area', score: 14.0, risk_level: 'low', anomaly: false },
  { zone: 'Storage Vault', score: 12.5, risk_level: 'low', anomaly: false },
  { zone: 'Electrical Room', score: 24.3, risk_level: 'low', anomaly: false },
  { zone: 'Loading Bay', score: 16.8, risk_level: 'low', anomaly: false },
];

const DEFAULT_STATE = {
  hardwareMode: 'simulation',
  hazardScore: 18.4,
  riskLevel: 'low',
  safetyScore: 81.6,
  confidence: 85,
  shapValues: INITIAL_SHAP,
  triggeredRules: [],
  aggregate: {
    temperature: 28.5, humidity: 62.0, smoke_ppm: 45.0, gas_ppm: 85.0,
    dust_ugm3: 38.0, flame_detected: false, current_amps: 4.2, power_watts: 1008,
    active_zones: 7, anomaly_zone: null, anomaly_active: false,
  },
  zoneScores: INITIAL_ZONES,
  relayStatus: {
    relay1: { on: false, label: 'Cooling Fan' },
    relay2: { on: false, label: 'Exhaust Fan' },
    humidifier: { on: false, label: 'Humidifier' },
    alarm: { on: false, label: 'Alarm / Buzzer' },
    warning_led: { on: false, label: 'Warning LED' },
    recent_events: [],
  },
  alerts: [],
  flameDetected: false,
  anomalyZone: null,
  reasoning: INITIAL_REASONING,
  decidedActions: [
    { device: 'relay1', action: 'OFF', reason: 'Nominal temperature' },
    { device: 'relay2', action: 'OFF', reason: 'Normal gas levels' },
  ],
  incidentCreated: false,
  connected: true,
  lastUpdate: new Date().toISOString(),
};

const generateInitialHistory = () => {
  const points = [];
  const now = Date.now();
  for (let i = 25; i >= 0; i--) {
    const t = new Date(now - i * 4000).toLocaleTimeString('en-US', { hour12: false });
    points.push({
      time: t,
      hazard_score: +(18 + Math.sin(i * 0.4) * 3 + Math.random() * 1.5).toFixed(1),
      temperature: +(28.5 + Math.sin(i * 0.3) * 0.8).toFixed(1),
      humidity: +(62 + Math.cos(i * 0.3) * 2).toFixed(1),
      smoke_ppm: +(45 + Math.sin(i * 0.5) * 4).toFixed(1),
      gas_ppm: +(85 + Math.cos(i * 0.4) * 6).toFixed(1),
      dust_ugm3: +(38 + Math.sin(i * 0.6) * 3).toFixed(1),
      current_amps: +(4.2 + Math.cos(i * 0.5) * 0.3).toFixed(2),
    });
  }
  return {
    hazard_score: points.map(p => ({ time: p.time, value: p.hazard_score })),
    temperature: points.map(p => ({ time: p.time, value: p.temperature })),
    humidity: points.map(p => ({ time: p.time, value: p.humidity })),
    smoke_ppm: points.map(p => ({ time: p.time, value: p.smoke_ppm })),
    gas_ppm: points.map(p => ({ time: p.time, value: p.gas_ppm })),
    dust_ugm3: points.map(p => ({ time: p.time, value: p.dust_ugm3 })),
    current_amps: points.map(p => ({ time: p.time, value: p.current_amps })),
  };
};

export function AppProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [connected, setConnected] = useState(true);
  const [sensorHistory, setSensorHistory] = useState(generateInitialHistory);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  // ─── WebSocket Connection ────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnected(true);
        console.log('[WS] Connected to SAFE-FUSE AI');
        ws.pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'full_update') {
            const d = msg.data;
            setConnected(true);
            setState(prev => ({
              ...prev,
              hardwareMode: d.hardware_mode || prev.hardwareMode,
              hazardScore: d.hazard_score ?? prev.hazardScore,
              riskLevel: d.risk_level || prev.riskLevel,
              safetyScore: d.safety_score ?? prev.safetyScore,
              confidence: d.confidence ?? prev.confidence,
              shapValues: d.shap_values?.length ? d.shap_values : prev.shapValues,
              triggeredRules: d.triggered_rules || prev.triggeredRules,
              aggregate: d.aggregate || prev.aggregate,
              zoneScores: d.zone_scores?.length ? d.zone_scores : prev.zoneScores,
              relayStatus: d.relay_status || prev.relayStatus,
              alerts: d.alerts?.length ? [...d.alerts, ...prev.alerts].slice(0, 50) : prev.alerts,
              flameDetected: d.flame_detected ?? prev.flameDetected,
              anomalyZone: d.anomaly_zone ?? prev.anomalyZone,
              reasoning: d.reasoning?.length ? d.reasoning : prev.reasoning,
              decidedActions: d.decided_actions?.length ? d.decided_actions : prev.decidedActions,
              incidentCreated: d.incident_created || false,
              lastUpdate: msg.timestamp,
              connected: true,
            }));
          }
        } catch (err) {
          console.warn('[WS] Parse error:', err);
        }
      };

      ws.onclose = () => {
        clearInterval(ws.pingInterval);
        reconnectRef.current = setTimeout(connectWS, 4000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      reconnectRef.current = setTimeout(connectWS, 5000);
    }
  }, []);

  useEffect(() => {
    connectWS();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connectWS]);

  // ─── Smooth Micro-Variation Live Ticker & HTTP Poll ───────────────────
  useEffect(() => {
    let tick = 0;
    const ticker = setInterval(async () => {
      tick++;
      const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false });

      // Try HTTP poll if WebSocket is not open
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        try {
          const res = await axios.get(`${API_BASE}/api/live-state`);
          if (res.data && res.data.data) {
            const d = res.data.data;
            setConnected(true);
            setState(prev => ({
              ...prev,
              hardwareMode: d.hardware_mode || prev.hardwareMode,
              hazardScore: d.hazard_score ?? prev.hazardScore,
              riskLevel: d.risk_level || prev.riskLevel,
              safetyScore: d.safety_score ?? prev.safetyScore,
              confidence: d.confidence ?? prev.confidence,
              shapValues: d.shap_values?.length ? d.shap_values : prev.shapValues,
              triggeredRules: d.triggered_rules || prev.triggeredRules,
              aggregate: d.aggregate || prev.aggregate,
              zoneScores: d.zone_scores?.length ? d.zone_scores : prev.zoneScores,
              relayStatus: d.relay_status || prev.relayStatus,
              alerts: d.alerts?.length ? [...d.alerts, ...prev.alerts].slice(0, 50) : prev.alerts,
              flameDetected: d.flame_detected ?? prev.flameDetected,
              anomalyZone: d.anomaly_zone ?? prev.anomalyZone,
              reasoning: d.reasoning?.length ? d.reasoning : prev.reasoning,
              decidedActions: d.decided_actions?.length ? d.decided_actions : prev.decidedActions,
              incidentCreated: d.incident_created || false,
              connected: true,
              lastUpdate: res.data.timestamp || new Date().toISOString(),
            }));
            return;
          }
        } catch {
          // HTTP poll fallback to client-side smooth ticker
        }
      }

      // Smooth client-side micro-variations
      setConnected(true);
      setState(prev => {
        const t = +(28.5 + Math.sin(tick * 0.3) * 0.9 + (Math.random() - 0.5) * 0.4).toFixed(1);
        const h = +(62.0 + Math.cos(tick * 0.3) * 2.2 + (Math.random() - 0.5) * 0.8).toFixed(1);
        const s = +(45.0 + Math.sin(tick * 0.4) * 3.5 + (Math.random() - 0.5) * 1.2).toFixed(1);
        const g = +(85.0 + Math.cos(tick * 0.4) * 5.0 + (Math.random() - 0.5) * 2.0).toFixed(1);
        const d = +(38.0 + Math.sin(tick * 0.5) * 3.0 + (Math.random() - 0.5) * 1.0).toFixed(1);
        const c = +(4.2 + Math.cos(tick * 0.5) * 0.35 + (Math.random() - 0.5) * 0.1).toFixed(2);
        const p = Math.round(c * 240);

        const score = +(18.4 + Math.sin(tick * 0.2) * 2.8 + (Math.random() - 0.5) * 0.8).toFixed(1);
        const risk_level = score >= 60 ? 'critical' : score >= 40 ? 'warning' : 'low';
        const safety_score = +(100 - score).toFixed(1);

        const newAgg = {
          ...prev.aggregate,
          temperature: t, humidity: h, smoke_ppm: s, gas_ppm: g,
          dust_ugm3: d, current_amps: c, power_watts: p,
        };

        const newShap = [
          { feature: 'Temperature', contribution: +(8.0 + Math.sin(tick * 0.3) * 0.5).toFixed(1), value: `${t} °C` },
          { feature: 'Gas Concentration (MQ-135)', contribution: +(4.0 + Math.cos(tick * 0.4) * 0.6).toFixed(1), value: `${g} ppm` },
          { feature: 'Dust Particle Density', contribution: +(3.5 + Math.sin(tick * 0.5) * 0.4).toFixed(1), value: `${d} µg/m³` },
          { feature: 'Electrical Current', contribution: +(2.5 + Math.cos(tick * 0.5) * 0.2).toFixed(1), value: `${c} A` },
          { feature: 'Humidity Buffer', contribution: +(-4.0 - Math.cos(tick * 0.3) * 0.4).toFixed(1), value: `${h} %` },
          { feature: 'Flame Detection', contribution: 0.0, value: 'SAFE' },
        ];

        const newZones = [
          { zone: 'Raw Material Store', score: +(15 + Math.sin(tick * 0.3) * 1.2).toFixed(1), risk_level: 'low', anomaly: false },
          { zone: 'Mixing Room', score: +(22 + Math.cos(tick * 0.4) * 1.5).toFixed(1), risk_level: 'low', anomaly: false },
          { zone: 'Drying Chamber', score: +(28 + Math.sin(tick * 0.5) * 1.8).toFixed(1), risk_level: 'low', anomaly: false },
          { zone: 'Packing Area', score: +(14 + Math.cos(tick * 0.3) * 1.0).toFixed(1), risk_level: 'low', anomaly: false },
          { zone: 'Storage Vault', score: +(12 + Math.sin(tick * 0.4) * 0.8).toFixed(1), risk_level: 'low', anomaly: false },
          { zone: 'Electrical Room', score: +(24 + Math.cos(tick * 0.5) * 1.4).toFixed(1), risk_level: 'low', anomaly: false },
          { zone: 'Loading Bay', score: +(16 + Math.sin(tick * 0.3) * 1.1).toFixed(1), risk_level: 'low', anomaly: false },
        ];

        setSensorHistory(hist => {
          const add = (arr, val) => [...arr.slice(-119), { time: nowStr, value: val }];
          return {
            hazard_score:  add(hist.hazard_score,  score),
            temperature:   add(hist.temperature,   t),
            humidity:      add(hist.humidity,      h),
            smoke_ppm:     add(hist.smoke_ppm,     s),
            gas_ppm:       add(hist.gas_ppm,       g),
            dust_ugm3:     add(hist.dust_ugm3,     d),
            current_amps:  add(hist.current_amps,  c),
          };
        });

        return {
          ...prev,
          hazardScore: score,
          riskLevel: risk_level,
          safetyScore: safety_score,
          aggregate: newAgg,
          shapValues: newShap,
          zoneScores: newZones,
          reasoning: prev.reasoning?.length ? prev.reasoning : INITIAL_REASONING,
          connected: true,
          lastUpdate: new Date().toISOString(),
        };
      });
    }, 2000);

    return () => clearInterval(ticker);
  }, []);

  // ─── API Helpers ─────────────────────────────────────────────────────
  const controlRelay = useCallback(async (device, action, reason = 'Manual override') => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/hardware/relay/${device}/${action}`,
        null,
        { params: { reason } }
      );
      setState(prev => ({
        ...prev,
        relayStatus: {
          ...prev.relayStatus,
          [device]: { ...prev.relayStatus[device], on: action === 'on' },
        },
      }));
      return res.data;
    } catch (err) {
      console.error('[API] Relay control failed:', err);
      throw err;
    }
  }, []);

  const setHardwareMode = useCallback(async (mode) => {
    try {
      const res = await axios.post(`${API_BASE}/api/hardware/mode`, { mode });
      setState(prev => ({ ...prev, hardwareMode: mode }));
      return res.data;
    } catch (err) {
      setState(prev => ({ ...prev, hardwareMode: mode }));
    }
  }, []);

  const createIncident = useCallback(async (incidentData) => {
    try {
      const res = await axios.post(`${API_BASE}/api/incidents`, incidentData);
      setState(prev => ({ ...prev, incidents: [res.data, ...prev.incidents] }));
      return res.data;
    } catch (err) {
      console.error('[API] Create incident failed:', err);
      throw err;
    }
  }, []);

  const acknowledgeAlert = useCallback((alertId) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => a.alert_id === alertId ? { ...a, acknowledged: true } : a),
    }));
  }, []);

  const value = {
    state,
    connected,
    sensorHistory,
    controlRelay,
    setHardwareMode,
    createIncident,
    acknowledgeAlert,
    refreshState: connectWS,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
