import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  Thermometer, Droplets, Wind, Flame, Activity, Zap,
  AlertTriangle, Fan, Waves, Bell, Radio, ShieldAlert,
  TrendingUp, Users, MapPin, ChevronRight, Eye, Power
} from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

// ─── Animated Radial Hazard Score ──────────────────────────────────────────
function HazardGauge({ score, color }) {
  const r = 58;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ * 0.75; // 270° arc
  const offset = circ * 0.125;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <svg viewBox="0 0 140 140" width="160" height="160" className="gauge-svg absolute">
        {/* Track */}
        <circle cx="70" cy="70" r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="10"
          strokeDasharray={`${circ * 0.75} ${circ}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
          transform="rotate(135 70 70)" />
        {/* Fill */}
        <motion.circle cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
          transform="rotate(135 70 70)"
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dasharray 1s ease' }}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <motion.div key={Math.round(score)} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
          className="text-4xl font-bold font-mono" style={{ color, fontFamily: 'var(--font-mono)' }}>
          {score.toFixed(0)}
        </motion.div>
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>HAZARD SCORE</div>
      </div>
    </div>
  );
}

// ─── Sensor Card ───────────────────────────────────────────────────────────
function SensorCard({ label, value, unit, icon: Icon, warn, critical, color, lowDanger }) {
  const v = parseFloat(value) || 0;
  const isCrit = lowDanger ? v <= critical : v >= critical;
  const isWarn = lowDanger ? (v <= warn && v > critical) : (v >= warn && v < critical);
  const statusColor = isCrit ? '#EF4444' : isWarn ? '#F97316' : color || '#22C55E';
  const pct = lowDanger
    ? Math.min(100, Math.max(0, ((warn - v) / warn) * 100))
    : Math.min(100, (v / critical) * 100);

  return (
    <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-4 flex flex-col gap-2"
      style={{ borderColor: isCrit ? 'rgba(239,68,68,0.25)' : 'var(--border-dim)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}30` }}>
            <Icon size={13} style={{ color: statusColor }} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        </div>
        {isCrit && <motion.div animate={{ opacity: [1, 0.3] }} transition={{ repeat: Infinity, duration: 0.5 }}
          className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />}
        {isWarn && !isCrit && <div className="w-2 h-2 rounded-full" style={{ background: '#F97316' }} />}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-xl font-bold font-mono" style={{ color: statusColor, fontFamily: 'var(--font-mono)' }}>
          {typeof value === 'boolean' ? (value ? 'YES' : 'NO') : (parseFloat(value) || 0).toFixed(1)}
        </span>
        <span className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{unit}</span>
      </div>
      <div className="progress-track">
        <motion.div className="progress-fill" style={{ background: statusColor }}
          animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
      </div>
    </motion.div>
  );
}

// ─── Quick Action Button ────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, color, onClick, active }) {
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
      style={{
        background: active ? `${color}20` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? color + '50' : 'var(--border-dim)'}`,
        boxShadow: active ? `0 0 12px ${color}30` : 'none',
      }}>
      <Icon size={16} style={{ color }} />
      <span className="text-[9px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </motion.button>
  );
}

export default function Dashboard() {
  const {
    hazardScore, riskLevel, safetyScore, confidence,
    aggregate, zoneScores, relayStatus, alerts, flameDetected,
    anomalyZone, reasoning, decidedActions, sensorHistory,
    scoreColor, riskColor, controlRelay, hardwareMode, API_BASE,
  } = useApp();

  const color = scoreColor(hazardScore);
  const [actionLoading, setActionLoading] = useState(null);

  const handleRelay = async (device, currentState) => {
    const action = currentState ? 'off' : 'on';
    setActionLoading(device);
    try { await controlRelay(device, action); }
    finally { setActionLoading(null); }
  };

  // Radar chart data for multi-sensor view
  const radarData = [
    { sensor: 'Temp', value: Math.min(100, ((aggregate.temperature - 20) / 70) * 100) },
    { sensor: 'Gas', value: Math.min(100, (aggregate.gas_ppm / 500) * 100) },
    { sensor: 'Smoke', value: Math.min(100, (aggregate.smoke_ppm / 400) * 100) },
    { sensor: 'Dust', value: Math.min(100, (aggregate.dust_ugm3 / 300) * 100) },
    { sensor: 'Current', value: Math.min(100, (aggregate.current_amps / 20) * 100) },
    { sensor: 'Humidity', value: Math.min(100, ((70 - aggregate.humidity) / 70) * 100) },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Mission Control</h1>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            SAFE-FUSE AI Demo Plant · {hardwareMode === 'hardware' ? '🔌 Hardware Mode' : '🔵 Simulation Mode'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {flameDetected && (
            <motion.div animate={{ opacity: [1, 0.2] }} transition={{ repeat: Infinity, duration: 0.4 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#EF4444' }}>
              <Flame size={12} /> FLAME DETECTED
            </motion.div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', color: 'var(--text-muted)' }}>
            <Radio size={10} style={{ color: hardwareMode === 'hardware' ? '#22C55E' : '#A855F7' }} />
            {hardwareMode === 'hardware' ? 'ESP32 Connected' : 'Simulation Active'}
          </div>
        </div>
      </div>

      {/* ─── Row 1: Hazard Score + Top KPIs ──────────────────────── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Hazard Score */}
        <div className="col-span-3 glass-card-bright p-4 flex flex-col items-center gap-2"
          style={{ borderColor: `${color}30` }}>
          <div className="section-label">Factory Hazard Score</div>
          <HazardGauge score={hazardScore} color={color} />
          <div className={`badge badge-${riskLevel} text-xs`}>{riskLevel.toUpperCase()} RISK</div>
          <div className="text-center mt-1">
            <div className="text-2xl font-bold" style={{ color: '#22C55E', fontFamily: 'var(--font-mono)' }}>
              {safetyScore.toFixed(0)}%
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Safety Score</div>
          </div>
          <div className="w-full mt-2">
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
              <span>AI Confidence</span>
              <span style={{ color: 'var(--cyan)' }}>{confidence}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${confidence}%`, background: 'var(--cyan)' }} />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="col-span-5 grid grid-cols-2 gap-3">
          <div className="glass-card p-4 col-span-2 flex items-center gap-4">
            <div className="flex-1">
              <div className="section-label mb-1">Active Zone</div>
              <div className="text-lg font-bold truncate" style={{ color: anomalyZone ? '#F97316' : '#22C55E' }}>
                {anomalyZone || 'All Clear'}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {anomalyZone ? 'Anomaly Detected' : 'No active anomalies'}
              </div>
            </div>
            <div>
              <MapPin size={24} style={{ color: anomalyZone ? '#F97316' : '#22C55E' }} />
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="section-label mb-1">Active Alerts</div>
            <div className="text-3xl font-bold font-mono" style={{ color: '#EF4444', fontFamily: 'var(--font-mono)' }}>
              {alerts.filter(a => a.severity === 'critical').length}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Critical</div>
          </div>

          <div className="glass-card p-4">
            <div className="section-label mb-1">AI Decisions</div>
            <div className="text-3xl font-bold font-mono" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
              {decidedActions.length}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>This cycle</div>
          </div>

          <div className="glass-card p-4">
            <div className="section-label mb-1">Fan</div>
            <div className="flex items-center gap-2 mt-1">
              <Fan size={20} className={relayStatus.relay1?.on ? 'fan-spinning' : ''}
                style={{ color: relayStatus.relay1?.on ? '#22C55E' : 'var(--text-muted)' }} />
              <span className={`badge ${relayStatus.relay1?.on ? 'badge-normal' : ''}`} style={{ fontSize: 9 }}>
                {relayStatus.relay1?.on ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="section-label mb-1">Humidifier</div>
            <div className="flex items-center gap-2 mt-1">
              <Waves size={20} style={{ color: relayStatus.humidifier?.on ? 'var(--cyan)' : 'var(--text-muted)' }} />
              <span className={`badge ${relayStatus.humidifier?.on ? 'badge-hw' : ''}`} style={{ fontSize: 9 }}>
                {relayStatus.humidifier?.on ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="col-span-4 glass-card p-4">
          <div className="section-label mb-2">Multi-Sensor Risk Radar</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(0,229,255,0.1)" />
              <PolarAngleAxis dataKey="sensor" tick={{ fill: '#475569', fontSize: 10 }} />
              <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Row 2: Live Sensor Cards ─────────────────────────────── */}
      <div>
        <div className="section-label mb-2">Live Sensor Readings</div>
        <div className="grid grid-cols-8 gap-3">
          <SensorCard label="Temperature" value={aggregate.temperature} unit="°C" icon={Thermometer}
            warn={45} critical={60} color="#F97316" />
          <SensorCard label="Humidity" value={aggregate.humidity} unit="%" icon={Droplets}
            warn={30} critical={20} color="var(--cyan)" lowDanger />
          <SensorCard label="Smoke (MQ-2)" value={aggregate.smoke_ppm} unit="ppm" icon={Wind}
            warn={150} critical={300} />
          <SensorCard label="Gas (MQ-135)" value={aggregate.gas_ppm} unit="ppm" icon={Activity}
            warn={200} critical={400} />
          <SensorCard label="Dust" value={aggregate.dust_ugm3} unit="µg/m³" icon={Eye}
            warn={100} critical={250} />
          <SensorCard label="Flame" value={aggregate.flame_detected} unit="" icon={Flame}
            warn={1} critical={1} color="#EF4444" />
          <SensorCard label="Current" value={aggregate.current_amps} unit="A" icon={Zap}
            warn={12} critical={18} />
          <SensorCard label="Power" value={(aggregate.power_watts / 1000).toFixed(2)} unit="kW" icon={Power}
            warn={2.8} critical={4.2} />
        </div>
      </div>

      {/* ─── Row 3: History Chart + Alerts + AI Decisions ────────── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Hazard Score History */}
        <div className="col-span-5 glass-card p-4">
          <div className="section-label mb-2">Hazard Score (Live)</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={sensorHistory.hazard_score.slice(-60)}>
              <defs>
                <linearGradient id="hazGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} axisLine={false} interval={9} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 6, fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#hazGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        <div className="col-span-4 glass-card p-4">
          <div className="section-label mb-2">Recent Alerts</div>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            <AnimatePresence>
              {alerts.slice(0, 6).map((a, i) => (
                <motion.div key={a.alert_id || i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 py-1.5 border-b" style={{ borderColor: 'var(--border-dim)' }}>
                  <AlertTriangle size={10} style={{ color: a.severity === 'critical' ? '#EF4444' : '#F97316', flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{a.title}</div>
                    <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{a.sensor} · {a.value?.toFixed?.(1)}{a.unit || ''}</div>
                  </div>
                  <span className={`badge badge-${a.severity}`} style={{ fontSize: 8 }}>{a.severity}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {alerts.length === 0 && (
              <div className="text-[11px] text-center py-4" style={{ color: 'var(--text-muted)' }}>No active alerts</div>
            )}
          </div>
        </div>

        {/* AI Decision Feed */}
        <div className="col-span-3 glass-card p-4">
          <div className="section-label mb-2">AI Actions</div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {decidedActions.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b" style={{ borderColor: 'var(--border-dim)' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: a.priority === 0 ? '#EF4444' : a.priority === 1 ? '#F97316' : '#22C55E' }} />
                <div className="text-[9px] leading-tight" style={{ color: 'var(--text-secondary)' }}>{a.label}</div>
              </div>
            ))}
            {decidedActions.length === 0 && (
              <div className="text-[11px] text-center py-4" style={{ color: 'var(--text-muted)' }}>Monitoring...</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Row 4: Quick Actions + Zone Status ───────────────────── */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5 glass-card p-4">
          <div className="section-label mb-3">Quick Control Actions</div>
          <div className="grid grid-cols-5 gap-2">
            <QuickAction icon={Fan} label="Cool Fan" color="#22C55E"
              active={relayStatus.relay1?.on} onClick={() => handleRelay('relay1', relayStatus.relay1?.on)} />
            <QuickAction icon={Fan} label="Exhaust" color="var(--cyan)"
              active={relayStatus.relay2?.on} onClick={() => handleRelay('relay2', relayStatus.relay2?.on)} />
            <QuickAction icon={Waves} label="Humid." color="#3B82F6"
              active={relayStatus.humidifier?.on} onClick={() => handleRelay('humidifier', relayStatus.humidifier?.on)} />
            <QuickAction icon={Bell} label="Alarm" color="#EF4444"
              active={relayStatus.alarm?.on} onClick={() => handleRelay('alarm', relayStatus.alarm?.on)} />
            <QuickAction icon={AlertTriangle} label="Evacuate" color="#7C3AED" active={false}
              onClick={() => alert('EVACUATION ALERT sent to all personnel!')} />
          </div>
        </div>

        <div className="col-span-7 glass-card p-4">
          <div className="section-label mb-2">Zone Risk Overview</div>
          <div className="grid grid-cols-7 gap-1.5">
            {zoneScores.map((z, i) => {
              const zc = z.risk_level === 'critical' ? '#EF4444' : z.risk_level === 'high' ? '#F97316' : z.risk_level === 'medium' ? '#EAB308' : '#22C55E';
              return (
                <div key={i} className="rounded-lg p-2 flex flex-col gap-1 items-center transition-all"
                  style={{ background: `${zc}12`, border: `1px solid ${zc}25` }}>
                  <div className="text-[8px] font-bold text-center leading-tight" style={{ color: zc }}>
                    {z.zone?.split(' ')[0]}
                  </div>
                  <div className="text-sm font-bold font-mono" style={{ color: zc, fontFamily: 'var(--font-mono)' }}>
                    {z.hazard_score?.toFixed(0)}
                  </div>
                  <div className={`badge badge-${z.risk_level}`} style={{ fontSize: 7, padding: '1px 4px' }}>
                    {z.risk_level?.slice(0, 3)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
