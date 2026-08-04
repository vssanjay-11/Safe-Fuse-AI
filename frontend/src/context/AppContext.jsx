import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const AppContext = createContext(null);

const API_BASE = 'http://localhost:8000';
const WS_URL   = 'ws://localhost:8000/ws';

// Default state when backend not yet connected
const DEFAULT_STATE = {
  hardwareMode: 'simulation',
  hazardScore: 0,
  riskLevel: 'low',
  safetyScore: 100,
  confidence: 85,
  shapValues: [],
  triggeredRules: [],
  aggregate: {
    temperature: 28.5, humidity: 62, smoke_ppm: 45, gas_ppm: 85,
    dust_ugm3: 38, flame_detected: false, current_amps: 4.2, power_watts: 1008,
    active_zones: 7, anomaly_zone: null, anomaly_active: false,
  },
  zoneScores: [],
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
  reasoning: [],
  decidedActions: [],
  incidentCreated: false,
  connected: false,
  lastUpdate: null,
};

export function AppProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [connected, setConnected] = useState(false);
  const [sensorHistory, setSensorHistory] = useState({
    hazard_score: [], temperature: [], humidity: [],
    smoke_ppm: [], gas_ppm: [], dust_ugm3: [], current_amps: [],
  });
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
        // Ping every 30s
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
            setState(prev => ({
              ...prev,
              hardwareMode: d.hardware_mode || prev.hardwareMode,
              hazardScore: d.hazard_score ?? prev.hazardScore,
              riskLevel: d.risk_level || prev.riskLevel,
              safetyScore: d.safety_score ?? prev.safetyScore,
              confidence: d.confidence ?? prev.confidence,
              shapValues: d.shap_values || prev.shapValues,
              triggeredRules: d.triggered_rules || prev.triggeredRules,
              aggregate: d.aggregate || prev.aggregate,
              zoneScores: d.zone_scores || prev.zoneScores,
              relayStatus: d.relay_status || prev.relayStatus,
              alerts: d.alerts?.length ? [...d.alerts, ...prev.alerts].slice(0, 50) : prev.alerts,
              flameDetected: d.flame_detected ?? prev.flameDetected,
              anomalyZone: d.anomaly_zone ?? prev.anomalyZone,
              reasoning: d.reasoning || prev.reasoning,
              decidedActions: d.decided_actions || prev.decidedActions,
              incidentCreated: d.incident_created || false,
              lastUpdate: msg.timestamp,
              connected: true,
            }));

            // Append to history
            if (msg.timestamp && d.aggregate) {
              const t = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });
              setSensorHistory(prev => {
                const add = (arr, val) => [...arr.slice(-119), { time: t, value: val }];
                return {
                  hazard_score:  add(prev.hazard_score,  d.hazard_score ?? 0),
                  temperature:   add(prev.temperature,   d.aggregate?.temperature ?? 0),
                  humidity:      add(prev.humidity,      d.aggregate?.humidity ?? 0),
                  smoke_ppm:     add(prev.smoke_ppm,     d.aggregate?.smoke_ppm ?? 0),
                  gas_ppm:       add(prev.gas_ppm,       d.aggregate?.gas_ppm ?? 0),
                  dust_ugm3:     add(prev.dust_ugm3,     d.aggregate?.dust_ugm3 ?? 0),
                  current_amps:  add(prev.current_amps,  d.aggregate?.current_amps ?? 0),
                };
              });
            }
          }
        } catch (err) {
          console.warn('[WS] Parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setState(prev => ({ ...prev, connected: false }));
        clearInterval(ws.pingInterval);
        // Auto-reconnect after 3s
        reconnectRef.current = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch (err) {
      console.warn('[WS] Connection error:', err);
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

  // ─── API Helpers ─────────────────────────────────────────────────────
  const controlRelay = useCallback(async (device, action, reason = 'Manual override') => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/hardware/relay/${device}/${action}`,
        null,
        { params: { reason } }
      );
      // Optimistic update
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

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/history`);
      setSensorHistory(res.data);
    } catch {}
  }, []);

  const updateSettings = useCallback(async (settings) => {
    try {
      const res = await axios.post(`${API_BASE}/api/settings`, settings);
      return res.data;
    } catch (err) {
      console.error('[API] Settings update failed:', err);
      throw err;
    }
  }, []);

  const resolveIncident = useCallback(async (incidentId) => {
    try {
      return await axios.patch(`${API_BASE}/api/incidents/${incidentId}/resolve`);
    } catch (err) {
      console.error('[API] Resolve incident failed:', err);
    }
  }, []);

  // Color helpers
  const riskColor = (level) => {
    if (level === 'critical') return '#EF4444';
    if (level === 'high')     return '#F97316';
    if (level === 'medium')   return '#EAB308';
    return '#22C55E';
  };

  const scoreColor = (score) => {
    if (score >= 75) return '#EF4444';
    if (score >= 50) return '#F97316';
    if (score >= 25) return '#EAB308';
    return '#22C55E';
  };

  const value = {
    ...state,
    connected,
    sensorHistory,
    controlRelay,
    fetchHistory,
    updateSettings,
    resolveIncident,
    riskColor,
    scoreColor,
    API_BASE,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
