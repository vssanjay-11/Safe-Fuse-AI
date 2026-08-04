import { useApp } from '../context/AppContext';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Fan, Waves, Bell, AlertTriangle, Wifi, WifiOff, Thermometer, Droplets, Wind, Flame, Activity, Zap, Power, Eye, Radio } from 'lucide-react';
import axios from 'axios';

function SensorPanel({ label, hardware, pin, value, unit, warn, critical, lowDanger, icon: Icon, sensorHistory, histKey, color }) {
  const v = parseFloat(value) || 0;
  const isCrit = lowDanger ? v <= critical : v >= critical;
  const isWarn = lowDanger ? (v <= warn && v > critical) : (v >= warn && v < critical);
  const statusColor = isCrit ? '#EF4444' : isWarn ? '#F97316' : color || '#22C55E';
  const statusLabel = isCrit ? 'CRITICAL' : isWarn ? 'WARNING' : 'NORMAL';

  const histData = sensorHistory[histKey] || [];

  return (
    <motion.div whileHover={{ scale: 1.01 }} className="glass-card p-4"
      style={{ borderColor: isCrit ? 'rgba(239,68,68,0.3)' : isWarn ? 'rgba(249,115,22,0.2)' : 'var(--border-dim)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
            <Icon size={15} style={{ color: statusColor }} />
          </div>
          <div>
            <div className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{label}</div>
            <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{hardware}</div>
          </div>
        </div>
        <div className="text-right">
          <span className={`badge badge-${isCrit ? 'critical' : isWarn ? 'warning' : 'normal'}`}>{statusLabel}</span>
          <div className="text-[8px] mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{pin}</div>
        </div>
      </div>

      <div className="text-3xl font-bold font-mono mb-1" style={{ color: statusColor, fontFamily: 'var(--font-mono)' }}>
        {typeof value === 'boolean' ? (value ? 'YES' : 'NO') : v.toFixed(1)}<span className="text-base ml-1">{unit}</span>
      </div>

      <div className="progress-track mb-2">
        <motion.div className="progress-fill" style={{ background: statusColor }}
          animate={{ width: `${Math.min(100, lowDanger ? ((warn - v) / warn) * 100 : (v / critical) * 100)}%` }}
          transition={{ duration: 0.8 }} />
      </div>

      {histData.length > 0 && (
        <ResponsiveContainer width="100%" height={50}>
          <LineChart data={histData.slice(-30)}>
            <Line type="monotone" dataKey="value" stroke={statusColor} dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex justify-between text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
        <span>Warn: {warn}{unit}</span>
        <span>Critical: {critical}{unit}</span>
      </div>
    </motion.div>
  );
}

function RelayCard({ device, label, description, icon: Icon, state, onToggle, loading, color }) {
  return (
    <motion.div className="glass-card p-4" style={{ borderColor: state ? `${color}30` : 'var(--border-dim)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center`}
            style={{ background: state ? `${color}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${state ? color + '40' : 'var(--border-dim)'}` }}>
            <Icon size={16} className={state && device === 'relay1' ? 'fan-spinning' : state && device === 'relay2' ? 'fan-slow' : ''}
              style={{ color: state ? color : 'var(--text-muted)' }} />
          </div>
          <div>
            <div className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{label}</div>
            <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{description}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`badge ${state ? 'badge-normal' : ''}`} style={{ fontSize: 10, color: state ? color : 'var(--text-muted)' }}>
            {state ? 'ON' : 'OFF'}
          </span>
          {state && (
            <motion.div className="w-2 h-2 rounded-full" style={{ background: color }}
              animate={{ opacity: [1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8 }} />
          )}
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        className={`w-full py-2 rounded-lg text-[11px] font-semibold transition-all ${state ? 'btn-danger' : 'btn-primary'}`}>
        {loading ? 'Switching...' : state ? `Turn OFF ${label}` : `Turn ON ${label}`}
      </button>
    </motion.div>
  );
}

export default function HardwareMonitor() {
  const { aggregate, relayStatus, controlRelay, hardwareMode, API_BASE, sensorHistory } = useApp();
  const [loading, setLoading] = useState(null);

  const handleToggle = async (device) => {
    const current = relayStatus[device]?.on;
    setLoading(device);
    try { await controlRelay(device, current ? 'off' : 'on', 'Manual override from Hardware Monitor'); }
    finally { setLoading(null); }
  };

  const SENSORS = [
    { label: 'Temperature', hardware: 'DHT22', pin: 'GPIO4', value: aggregate.temperature, unit: '°C', warn: 45, critical: 60, icon: Thermometer, histKey: 'temperature', color: '#F97316' },
    { label: 'Humidity', hardware: 'DHT22', pin: 'GPIO4', value: aggregate.humidity, unit: '%', warn: 30, critical: 20, lowDanger: true, icon: Droplets, histKey: 'humidity', color: 'var(--cyan)' },
    { label: 'Smoke (MQ-2)', hardware: 'MQ-2 Gas Sensor', pin: 'GPIO34 ADC', value: aggregate.smoke_ppm, unit: 'ppm', warn: 150, critical: 300, icon: Wind, histKey: 'smoke_ppm' },
    { label: 'Gas (MQ-135)', hardware: 'MQ-135 Air Quality', pin: 'GPIO35 ADC', value: aggregate.gas_ppm, unit: 'ppm', warn: 200, critical: 400, icon: Activity, histKey: 'gas_ppm' },
    { label: 'Dust', hardware: 'GP2Y1010AU0F', pin: 'GPIO32 ADC', value: aggregate.dust_ugm3, unit: 'µg/m³', warn: 100, critical: 250, icon: Eye, histKey: 'dust_ugm3' },
    { label: 'Flame Sensor', hardware: 'IR Flame Sensor', pin: 'GPIO26 Digital', value: aggregate.flame_detected, unit: '', warn: 1, critical: 1, icon: Flame, histKey: 'hazard_score', color: '#EF4444' },
    { label: 'Current (ACS712)', hardware: 'ACS712 20A', pin: 'GPIO33 ADC', value: aggregate.current_amps, unit: 'A', warn: 12, critical: 18, icon: Zap, histKey: 'current_amps' },
    { label: 'Power', hardware: 'Computed (V×I)', pin: '—', value: aggregate.power_watts, unit: 'W', warn: 2800, critical: 4200, icon: Power, histKey: 'current_amps', color: '#7C3AED' },
  ];

  const RELAYS = [
    { device: 'relay1', label: 'Cooling Fan', description: 'Relay 1 → 12V DC Fan', icon: Fan, color: '#22C55E' },
    { device: 'relay2', label: 'Exhaust Fan', description: 'Relay 2 → 12V Exhaust', icon: Fan, color: 'var(--cyan)' },
    { device: 'humidifier', label: 'Humidifier', description: 'Relay 2 → Mini Humidifier', icon: Waves, color: '#3B82F6' },
    { device: 'alarm', label: 'Alarm / Buzzer', description: 'GPIO13 → Active Buzzer', icon: Bell, color: '#EF4444' },
    { device: 'warning_led', label: 'Warning LED', description: 'GPIO12 → Warning LED Array', icon: AlertTriangle, color: '#F97316' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Hardware Monitor</h1>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            ESP32 Sensors · Live Readings · Relay Control
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs glass-card">
            <Radio size={11} style={{ color: hardwareMode === 'hardware' ? '#22C55E' : '#A855F7' }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {hardwareMode === 'hardware' ? 'ESP32 Hardware Mode' : 'Simulation Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div>
        <div className="section-label mb-2">Sensor Readings</div>
        <div className="grid grid-cols-4 gap-3">
          {SENSORS.map((s, i) => (
            <SensorPanel key={i} {...s} sensorHistory={sensorHistory} />
          ))}
        </div>
      </div>

      {/* Relay Controls */}
      <div>
        <div className="section-label mb-2">Relay & Actuator Control</div>
        <div className="grid grid-cols-5 gap-3">
          {RELAYS.map(r => (
            <RelayCard key={r.device}
              {...r}
              state={relayStatus[r.device]?.on || false}
              onToggle={() => handleToggle(r.device)}
              loading={loading === r.device}
            />
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="glass-card p-4">
        <div className="section-label mb-2">Recent Relay Events</div>
        <div className="space-y-1">
          {(relayStatus.recent_events || []).slice(0, 8).map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 border-b text-[10px]"
              style={{ borderColor: 'var(--border-dim)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: e.action === 'ON' ? '#22C55E' : '#EF4444' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{e.device_label}</span>
              <span className={`badge ${e.action === 'ON' ? 'badge-normal' : 'badge-critical'}`} style={{ fontSize: 8 }}>
                {e.action}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{e.triggered_by}</span>
              <span className="flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{e.reason}</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>
                {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : ''}
              </span>
            </div>
          ))}
          {(!relayStatus.recent_events || relayStatus.recent_events.length === 0) && (
            <div className="text-[11px] text-center py-3" style={{ color: 'var(--text-muted)' }}>No relay events yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
