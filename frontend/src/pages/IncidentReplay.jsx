import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Flame, Wind, Zap, Shield, CheckCircle,
  Clock, Filter, Play, Pause, SkipBack, SkipForward,
  Camera, Activity, MapPin, Cpu, ChevronDown, ChevronUp,
  Radio, Eye, TrendingUp, BarChart2, RefreshCw, Thermometer,
  Droplets, AlertOctagon, Battery
} from 'lucide-react';
import axios from 'axios';

/* ─── Mock Data ──────────────────────────────────────────────── */
const MOCK_INCIDENTS = [
  {
    incident_id: 'INC-8A91B2CF',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    title: '🚨 CRITICAL: Active Fire / Ignition Detected',
    incident_type: 'fire',
    severity: 'critical',
    hazard_score: 88.5,
    zone: 'Mixing Room',
    status: 'open',
    duration_minutes: 5,
    cctv_image: '/cctv_fire.png',
    cctv_label: 'CAM-01 · MIXING ROOM',
    cctv_time: '02:43:09',
    sensor_snapshot: { temperature: 58.2, humidity: 18.5, smoke_ppm: 340, gas_ppm: 420, dust_ugm3: 180, flame_detected: true, current_amps: 15.4 },
    triggered_rules: [
      { id: 'FLAME_GAS', label: 'Open Flame + Gas Present', bonus: 40 },
      { id: 'IGNITION_RISK', label: 'Ignition Risk Compound', bonus: 25 },
    ],
    ai_reasoning: 'STEP 1 [ASSESS]: Overall Hazard Score 88.5% (CRITICAL) → STEP 2 [ANALYZE]: Flame Sensor DETECTED + Gas 420ppm → STEP 3 [COMPOUND]: Open Flame + Gas Present rule triggered → STEP 4 [ESCALATE]: Immediate emergency protocol initiated.',
    actions_taken: ['Activate Exhaust Fan', 'Trigger Alarm / Buzzer', 'Activate Warning LED', '⚠️ EVACUATION ALERT'],
    timeline: [
      { t: '02:43:05', event: 'Flame sensor triggered', type: 'danger' },
      { t: '02:43:07', event: 'Gas spike detected (420ppm)', type: 'danger' },
      { t: '02:43:08', event: 'AI compound rule FLAME_GAS activated', type: 'warn' },
      { t: '02:43:09', event: 'Exhaust fan activated', type: 'action' },
      { t: '02:43:10', event: 'Alarm / Buzzer triggered', type: 'action' },
      { t: '02:43:11', event: 'Evacuation alert dispatched', type: 'critical' },
    ],
    reported_by: 'SAFE-FUSE AI',
  },
  {
    incident_id: 'INC-7C34D9E0',
    timestamp: new Date(Date.now() - 1000 * 60 * 62).toISOString(),
    title: '⚠️ HIGH: Dust Explosion Risk Detected',
    incident_type: 'dust_explosion',
    severity: 'high',
    hazard_score: 72.0,
    zone: 'Storage Vault',
    status: 'open',
    duration_minutes: 18,
    cctv_image: '/cctv_dust.png',
    cctv_label: 'CAM-02 · STORAGE VAULT',
    cctv_time: '01:41:16',
    sensor_snapshot: { temperature: 44.0, humidity: 24.0, smoke_ppm: 160, gas_ppm: 210, dust_ugm3: 280, flame_detected: false, current_amps: 8.2 },
    triggered_rules: [
      { id: 'DUST_EXPLOSION', label: 'Dust Explosion Potential', bonus: 30 },
    ],
    ai_reasoning: 'STEP 1 [ASSESS]: Hazard Score 72.0% (HIGH) → STEP 2 [ANALYZE]: High dust density (280µg/m³) + low humidity (24%) → STEP 3 [COMPOUND]: Dust Explosion Potential triggered → STEP 4 [ACTION]: Exhaust fan & humidifier activated.',
    actions_taken: ['Activate Exhaust Fan', 'Activate Humidifier', 'Activate Warning LED'],
    timeline: [
      { t: '01:41:10', event: 'Dust concentration exceeded 250µg/m³', type: 'warn' },
      { t: '01:41:14', event: 'Humidity drop detected (24%)', type: 'warn' },
      { t: '01:41:16', event: 'AI rule DUST_EXPLOSION triggered', type: 'danger' },
      { t: '01:41:17', event: 'Exhaust fan activated', type: 'action' },
      { t: '01:41:18', event: 'Humidifier activated', type: 'action' },
    ],
    reported_by: 'SAFE-FUSE AI',
  },
  {
    incident_id: 'INC-6E12A4B8',
    timestamp: new Date(Date.now() - 1000 * 60 * 125).toISOString(),
    title: '⚠️ HIGH: Hazardous Gas Concentration Alert',
    incident_type: 'gas_leak',
    severity: 'high',
    hazard_score: 64.5,
    zone: 'Chemical Plant Zone 3',
    status: 'resolved',
    duration_minutes: 42,
    cctv_image: '/cctv_gas.png',
    cctv_label: 'CAM-03 · CHEM ZONE 3',
    cctv_time: '00:38:10',
    sensor_snapshot: { temperature: 38.5, humidity: 45.0, smoke_ppm: 110, gas_ppm: 380, dust_ugm3: 45, flame_detected: false, current_amps: 6.0 },
    triggered_rules: [
      { id: 'CHEMICAL_RELEASE', label: 'Chemical Release Detected', bonus: 20 },
    ],
    ai_reasoning: 'STEP 1 [ASSESS]: Hazard Score 64.5% (HIGH) → STEP 2 [ANALYZE]: Gas concentration spike (380ppm MQ-135) → STEP 3 [ACTION]: Exhaust ventilation initiated until gas levels normalized.',
    actions_taken: ['Activate Exhaust Fan'],
    timeline: [
      { t: '00:38:02', event: 'Gas level crossed 300ppm threshold', type: 'warn' },
      { t: '00:38:10', event: 'Gas rising — 380ppm (ALERT)', type: 'danger' },
      { t: '00:38:11', event: 'AI rule CHEMICAL_RELEASE triggered', type: 'danger' },
      { t: '00:38:12', event: 'Exhaust fan activated', type: 'action' },
      { t: '01:20:05', event: 'Gas normalized below 100ppm', type: 'safe' },
      { t: '01:20:06', event: 'Incident resolved by AI', type: 'safe' },
    ],
    reported_by: 'SAFE-FUSE AI',
  },
  {
    incident_id: 'INC-4F56E7D8',
    timestamp: new Date(Date.now() - 1000 * 60 * 245).toISOString(),
    title: 'Electrical Overload Warning',
    incident_type: 'electrical',
    severity: 'medium',
    hazard_score: 48.0,
    zone: 'Electrical Room',
    status: 'resolved',
    duration_minutes: 12,
    cctv_image: '/cctv_electrical.png',
    cctv_label: 'CAM-04 · ELECTRICAL ROOM',
    cctv_time: '22:15:03',
    sensor_snapshot: { temperature: 49.0, humidity: 28.0, smoke_ppm: 85, gas_ppm: 120, dust_ugm3: 30, flame_detected: false, current_amps: 16.8 },
    triggered_rules: [
      { id: 'ELECTRICAL_HAZARD', label: 'Electrical Overload + Humidity', bonus: 15 },
    ],
    ai_reasoning: 'STEP 1 [ASSESS]: Hazard Score 48.0% (MEDIUM) → STEP 2 [ANALYZE]: Current 16.8A exceeding safe threshold (12A) → STEP 3 [ACTION]: Cooling fan enabled to prevent electrical fire.',
    actions_taken: ['Activate Cooling Fan'],
    timeline: [
      { t: '22:15:00', event: 'Current spike to 16.8A detected', type: 'warn' },
      { t: '22:15:03', event: 'AI rule ELECTRICAL_HAZARD triggered', type: 'warn' },
      { t: '22:15:04', event: 'Cooling fan activated', type: 'action' },
      { t: '22:27:00', event: 'Current normalized to 9.2A', type: 'safe' },
      { t: '22:27:01', event: 'Incident resolved', type: 'safe' },
    ],
    reported_by: 'SAFE-FUSE AI',
  },
  {
    incident_id: 'INC-3B22C1AA',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    title: 'Thermal Runaway Risk — Overheating Zone',
    incident_type: 'ignition_risk',
    severity: 'high',
    hazard_score: 67.0,
    zone: 'Production Line B',
    status: 'resolved',
    duration_minutes: 28,
    cctv_image: '/cctv_thermal.png',
    cctv_label: 'CAM-05 · PROD LINE B',
    cctv_time: '19:10:06',
    sensor_snapshot: { temperature: 61.4, humidity: 20.1, smoke_ppm: 95, gas_ppm: 145, dust_ugm3: 60, flame_detected: false, current_amps: 11.0 },
    triggered_rules: [
      { id: 'TEMP_HIGH', label: 'High Temperature Zone', bonus: 22 },
      { id: 'LOW_HUMIDITY', label: 'Low Humidity Ignition Risk', bonus: 18 },
    ],
    ai_reasoning: 'STEP 1 [ASSESS]: Hazard Score 67.0% (HIGH) → STEP 2 [ANALYZE]: Temperature 61.4°C + humidity only 20.1% → STEP 3 [COMPOUND]: Thermal runaway risk identified → STEP 4 [ACTION]: Cooling fan + humidifier activated.',
    actions_taken: ['Activate Cooling Fan', 'Activate Humidifier', 'Activate Warning LED'],
    timeline: [
      { t: '19:10:00', event: 'Temperature climbed to 61°C', type: 'danger' },
      { t: '19:10:04', event: 'Humidity dropped below 22%', type: 'warn' },
      { t: '19:10:06', event: 'AI rule TEMP_HIGH + LOW_HUMIDITY activated', type: 'danger' },
      { t: '19:10:07', event: 'Cooling fan activated', type: 'action' },
      { t: '19:10:08', event: 'Humidifier activated', type: 'action' },
      { t: '19:38:20', event: 'Temperature normalized to 33°C', type: 'safe' },
      { t: '19:38:21', event: 'Incident resolved', type: 'safe' },
    ],
    reported_by: 'SAFE-FUSE AI',
  },
  {
    incident_id: 'INC-2A10F9CC',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    title: 'Smoke Accumulation — Ventilation Failure',
    incident_type: 'general_hazard',
    severity: 'medium',
    hazard_score: 52.0,
    zone: 'Assembly Hall',
    status: 'resolved',
    duration_minutes: 21,
    cctv_image: '/cctv_smoke.png',
    cctv_label: 'CAM-06 · ASSEMBLY HALL',
    cctv_time: '14:02:05',
    sensor_snapshot: { temperature: 33.5, humidity: 50.0, smoke_ppm: 295, gas_ppm: 180, dust_ugm3: 110, flame_detected: false, current_amps: 5.0 },
    triggered_rules: [
      { id: 'SMOKE_HIGH', label: 'Smoke Concentration Alert', bonus: 20 },
    ],
    ai_reasoning: 'STEP 1 [ASSESS]: Hazard Score 52.0% (MEDIUM) → STEP 2 [ANALYZE]: Smoke 295ppm in Assembly Hall → STEP 3 [ACTION]: Exhaust activated, smoke cleared within 21 mins.',
    actions_taken: ['Activate Exhaust Fan', 'Activate Warning LED'],
    timeline: [
      { t: '14:02:00', event: 'Smoke PPM exceeded 200 threshold', type: 'warn' },
      { t: '14:02:05', event: 'Ventilation failure detected', type: 'danger' },
      { t: '14:02:06', event: 'Exhaust fan manually overridden ON', type: 'action' },
      { t: '14:23:10', event: 'Smoke levels back to 40ppm', type: 'safe' },
      { t: '14:23:11', event: 'Incident resolved', type: 'safe' },
    ],
    reported_by: 'SAFE-FUSE AI',
  },
  {
    incident_id: 'INC-1F88B3DC',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    title: 'Power Surge — Arc Flash Risk',
    incident_type: 'electrical',
    severity: 'critical',
    hazard_score: 82.0,
    zone: 'Main Distribution Board',
    status: 'resolved',
    duration_minutes: 7,
    cctv_image: '/cctv_arc.png',
    cctv_label: 'CAM-07 · MAIN DIST BOARD',
    cctv_time: '09:05:01',
    sensor_snapshot: { temperature: 52.0, humidity: 22.0, smoke_ppm: 200, gas_ppm: 90, dust_ugm3: 20, flame_detected: false, current_amps: 19.6 },
    triggered_rules: [
      { id: 'ARC_FLASH', label: 'Arc Flash Risk — Overcurrent', bonus: 35 },
      { id: 'ELECTRICAL_HAZARD', label: 'Electrical Overload + Humidity', bonus: 20 },
    ],
    ai_reasoning: 'STEP 1 [ASSESS]: Hazard Score 82.0% (CRITICAL) → STEP 2 [ANALYZE]: Current 19.6A (far above 12A limit) in MDB → STEP 3 [COMPOUND]: Arc Flash rule triggered → STEP 4 [ACTION]: Immediate shutdown relay + cooling fan activated.',
    actions_taken: ['Activate Cooling Fan', 'Trigger Alarm / Buzzer', 'Activate Warning LED'],
    timeline: [
      { t: '09:05:00', event: 'Current spike — 19.6A in MDB', type: 'danger' },
      { t: '09:05:01', event: 'AI rule ARC_FLASH triggered', type: 'critical' },
      { t: '09:05:02', event: 'Alarm activated', type: 'action' },
      { t: '09:05:03', event: 'Cooling fan activated', type: 'action' },
      { t: '09:12:00', event: 'Current stabilized to 8.4A', type: 'safe' },
      { t: '09:12:01', event: 'Incident resolved', type: 'safe' },
    ],
    reported_by: 'SAFE-FUSE AI',
  },
  {
    incident_id: 'INC-0D55A7EE',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    title: 'Flammable Gas Accumulation — Zone 7',
    incident_type: 'gas_leak',
    severity: 'high',
    hazard_score: 70.5,
    zone: 'Zone 7 — Compressor Bay',
    status: 'resolved',
    duration_minutes: 35,
    cctv_image: '/cctv_compressor.png',
    cctv_label: 'CAM-08 · COMPRESSOR BAY',
    cctv_time: '00:14:02',
    sensor_snapshot: { temperature: 36.0, humidity: 40.0, smoke_ppm: 130, gas_ppm: 460, dust_ugm3: 35, flame_detected: false, current_amps: 7.5 },
    triggered_rules: [
      { id: 'CHEMICAL_RELEASE', label: 'Chemical Release Detected', bonus: 25 },
      { id: 'GAS_HIGH', label: 'High Gas Concentration', bonus: 20 },
    ],
    ai_reasoning: 'STEP 1 [ASSESS]: Hazard Score 70.5% (HIGH) → STEP 2 [ANALYZE]: Gas 460ppm in compressor bay (highly flammable zone) → STEP 3 [COMPOUND]: Multiple gas rules activated → STEP 4 [ACTION]: Exhaust fan + ventilation protocol.',
    actions_taken: ['Activate Exhaust Fan', 'Activate Warning LED'],
    timeline: [
      { t: '00:14:00', event: 'Gas sensor triggered — 460ppm in Zone 7', type: 'danger' },
      { t: '00:14:02', event: 'AI escalated — flammable zone proximity risk', type: 'danger' },
      { t: '00:14:03', event: 'Exhaust fan activated', type: 'action' },
      { t: '00:49:00', event: 'Gas normalized below 100ppm', type: 'safe' },
      { t: '00:49:01', event: 'Incident resolved', type: 'safe' },
    ],
    reported_by: 'SAFE-FUSE AI',
  },
];

/* ─── Severity Config ────────────────────────────────────────── */
const SEV = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: Flame },
  high:     { color: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', icon: AlertTriangle },
  medium:   { color: '#EAB308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  icon: Wind },
  low:      { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  icon: Shield },
};

const TIMELINE_COLORS = {
  danger: '#EF4444',
  warn:   '#F97316',
  action: '#00E5FF',
  critical: '#DC2626',
  safe:   '#22C55E',
};

/* ─── Camera Feed Panel ──────────────────────────────────────── */
function CameraFeed({ zone, severity, isOpen, image, label, time }) {
  const sev = SEV[severity] || SEV.low;
  const [tick, setTick] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setTick(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  return (
    <div className="glass-card overflow-hidden" style={{ border: `1px solid ${sev.border}`, boxShadow: isOpen ? `0 0 12px ${sev.color}20` : 'none' }}>
      <div className="relative overflow-hidden" style={{ height: 130 }}>
        {/* CCTV image */}
        {image ? (
          <img
            src={image}
            alt={`CCTV ${zone}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isOpen ? 'none' : 'grayscale(60%) brightness(0.7)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, #040810 60%, ${sev.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={28} style={{ color: sev.color, opacity: 0.4 }} />
          </div>
        )}
        {/* Scanline overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px)',
          backgroundSize: '100% 3px',
        }} />
        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }} />
        {/* Alert pulse tint */}
        {isOpen && (
          <motion.div
            animate={{ opacity: [0, 0.1, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            style={{ position: 'absolute', inset: 0, background: sev.color, pointerEvents: 'none' }}
          />
        )}
        {/* Corner brackets */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
          <div key={pos} style={{
            position: 'absolute',
            top: pos.includes('top') ? 5 : undefined,
            bottom: pos.includes('bottom') ? 5 : undefined,
            left: pos.includes('left') ? 5 : undefined,
            right: pos.includes('right') ? 5 : undefined,
            width: 10, height: 10,
            borderTop: pos.includes('top') ? `2px solid ${sev.color}` : 'none',
            borderBottom: pos.includes('bottom') ? `2px solid ${sev.color}` : 'none',
            borderLeft: pos.includes('left') ? `2px solid ${sev.color}` : 'none',
            borderRight: pos.includes('right') ? `2px solid ${sev.color}` : 'none',
            pointerEvents: 'none',
          }} />
        ))}
        {/* REC indicator */}
        {isOpen && (
          <div style={{ position: 'absolute', top: 7, right: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
            <motion.div
              animate={{ opacity: [1, 0.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }}
            />
            <span style={{ fontSize: 9, color: '#EF4444', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>REC</span>
          </div>
        )}
        {/* Timestamp top-left */}
        <div style={{
          position: 'absolute', top: 7, left: 8, fontSize: 10,
          color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        }}>
          {isOpen ? tick : (time || '—')}
        </div>
        {/* Label bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          padding: '14px 8px 5px',
          fontSize: 10, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-mono)',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        }}>
          {label || zone}
        </div>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5" style={{ borderTop: `1px solid ${sev.border}` }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{zone.slice(0, 18)}</span>
        <span className={`badge badge-${severity}`} style={{ fontSize: 9, padding: '1px 6px' }}>
          {isOpen ? '🔴 LIVE' : '⏺ ARCHIVED'}
        </span>
      </div>
    </div>
  );
}

/* ─── Mini Sparkline ─────────────────────────────────────────── */
function Sparkline({ data, color, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <polyline points={`0,${height} ${pts} ${width},${height}`}
        fill={`${color}18`} stroke="none" />
    </svg>
  );
}

/* ─── Sensor Mini Card ───────────────────────────────────────── */
function SensorMini({ label, value, unit, sparkData, color, icon: Icon }) {
  return (
    <div className="glass-card p-2.5 flex flex-col gap-1.5" style={{ minWidth: 0 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={10} style={{ color }} />}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
          {value}<span style={{ fontSize: 10, opacity: 0.7 }}>{unit}</span>
        </span>
      </div>
      <Sparkline data={sparkData} color={color} width={80} height={20} />
    </div>
  );
}

/* ─── Timeline Strip ─────────────────────────────────────────── */
function TimelineStrip({ events }) {
  return (
    <div className="relative pl-4">
      <div style={{
        position: 'absolute', left: 7, top: 0, bottom: 0,
        width: 1, background: 'rgba(0,229,255,0.1)'
      }} />
      {events.map((ev, i) => {
        const col = TIMELINE_COLORS[ev.type] || '#94A3B8';
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-2.5 mb-2.5 relative"
          >
            <div style={{
              position: 'absolute', left: -11, top: 5,
              width: 7, height: 7, borderRadius: '50%',
              background: col, boxShadow: `0 0 6px ${col}60`,
            }} />
            <div style={{ fontSize: 11, color: col, fontFamily: 'var(--font-mono)', flexShrink: 0, paddingTop: 3 }}>
              {ev.t}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 2, lineHeight: 1.4 }}>
              {ev.event}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Incident Card ──────────────────────────────────────────── */
function IncidentCard({ incident, onResolve, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEV[incident.severity] || SEV.low;
  const SevIcon = sev.icon;
  const isOpen = incident.status === 'open';

  // Fake sparkline data derived from sensor snapshot
  const tempSpark = Array.from({ length: 12 }, (_, i) =>
    (incident.sensor_snapshot.temperature - 15 + Math.random() * 5 + i * 1.2).toFixed(1) * 1
  );
  const gasSpark = Array.from({ length: 12 }, (_, i) =>
    Math.max(50, incident.sensor_snapshot.gas_ppm - 80 + Math.random() * 30 + i * 5)
  );

  return (
    <motion.div
      layout
      className="glass-card overflow-hidden cursor-pointer"
      style={{
        borderColor: isSelected ? sev.color + '60' : isOpen ? sev.border : 'var(--border-dim)',
        boxShadow: isSelected ? `0 0 20px ${sev.color}15` : undefined,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
      onClick={() => { onSelect(incident.incident_id); setExpanded(e => !e); }}
    >
      {/* Severity accent bar */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${sev.color}, transparent)` }} />

      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
            <SevIcon size={16} style={{ color: sev.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {incident.title}
              </h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`badge badge-${incident.severity}`} style={{ fontSize: 11 }}>{incident.severity}</span>
                <span className={`badge ${isOpen ? 'badge-warning' : 'badge-normal'}`} style={{ fontSize: 11 }}>
                  {incident.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1.5" style={{ flexWrap: 'wrap', gap: '6px 10px' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{incident.incident_id}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
              <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                <MapPin size={8} /> {incident.zone}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
              <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                <Clock size={8} /> {new Date(incident.timestamp).toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 11, color: sev.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                Score: {incident.hazard_score?.toFixed(0)}%
              </span>
              {incident.duration_minutes && (
                <>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>~{incident.duration_minutes}min</span>
                </>
              )}
            </div>
          </div>
          <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>

        {/* Hazard bar */}
        <div className="mt-3">
          <div className="progress-track">
            <motion.div
              className="progress-fill"
              style={{ background: `linear-gradient(90deg, ${sev.color}80, ${sev.color})` }}
              initial={{ width: 0 }}
              animate={{ width: `${incident.hazard_score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t"
            style={{ borderColor: 'var(--border-dim)' }}
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Left: Camera + Sensors */}
                <div className="space-y-3">
                  <CameraFeed zone={incident.zone} severity={incident.severity} isOpen={isOpen} image={incident.cctv_image} label={incident.cctv_label} time={incident.cctv_time} />
                  {/* Mini sensor sparklines */}
                  <div className="grid grid-cols-2 gap-2">
                    <SensorMini label="TEMP" value={incident.sensor_snapshot.temperature} unit="°C"
                      sparkData={tempSpark} color="#EF4444" icon={Thermometer} />
                    <SensorMini label="GAS" value={incident.sensor_snapshot.gas_ppm} unit="ppm"
                      sparkData={gasSpark} color="#F97316" icon={Wind} />
                  </div>
                  {/* Sensor Snapshot Grid */}
                  <div>
                    <div className="section-label mb-1.5">Sensor Snapshot</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {Object.entries(incident.sensor_snapshot).map(([k, v]) => {
                        if (v === null || v === undefined) return null;
                        const isBool = typeof v === 'boolean';
                        const boolColor = isBool ? (v ? '#EF4444' : '#22C55E') : 'var(--text-primary)';
                        return (
                          <div key={k} className="px-2 py-1.5 rounded-lg text-center"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k.replace(/_/g, ' ')}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: boolColor, marginTop: 2 }}>
                              {isBool ? (v ? 'YES' : 'NO') : v?.toFixed?.(1) ?? v}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Timeline + AI */}
                <div className="space-y-3">
                  {/* Event Timeline */}
                  <div>
                    <div className="section-label mb-2">Event Timeline</div>
                    <TimelineStrip events={incident.timeline} />
                  </div>

                  {/* AI Reasoning */}
                  <div>
                    <div className="section-label mb-1.5">AI Reasoning Chain</div>
                    <div className="p-3 rounded-lg text-[12px] leading-relaxed"
                      style={{
                        background: 'rgba(0,229,255,0.04)', color: 'var(--text-secondary)',
                        border: '1px solid rgba(0,229,255,0.08)', fontFamily: 'var(--font-mono)'
                      }}>
                      {incident.ai_reasoning}
                    </div>
                  </div>

                  {/* Triggered Rules */}
                  <div>
                    <div className="section-label mb-1.5">Triggered Rules</div>
                    <div className="space-y-1.5">
                      {incident.triggered_rules.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', fontFamily: 'var(--font-mono)' }}>{r.id}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.label}</div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#F97316', fontFamily: 'var(--font-mono)' }}>+{r.bonus}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Taken */}
                  {incident.actions_taken?.length > 0 && (
                    <div>
                      <div className="section-label mb-1.5">AI Actions Taken</div>
                      <div className="flex flex-wrap gap-1.5">
                        {incident.actions_taken.map((a, i) => (
                          <span key={i} className="badge badge-hw" style={{ fontSize: 11 }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolve */}
                  {isOpen && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onResolve(incident.incident_id); }}
                      className="btn-success flex items-center gap-1.5 text-xs w-full justify-center"
                    >
                      <CheckCircle size={12} /> Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Activity Feed ──────────────────────────────────────────── */
function ActivityFeed({ incidents }) {
  const allEvents = incidents.flatMap(inc =>
    (inc.timeline || []).map(ev => ({
      ...ev,
      zone: inc.zone,
      incident_id: inc.incident_id,
      severity: inc.severity,
    }))
  ).slice(0, 14);

  return (
    <div className="glass-card p-4 h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Radio size={12} style={{ color: 'var(--cyan)' }} />
        <span className="section-label">Live Activity Feed</span>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', marginLeft: 'auto' }}
        />
      </div>
      <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 340 }}>
        {allEvents.map((ev, i) => {
          const col = TIMELINE_COLORS[ev.type] || '#94A3B8';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2 p-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: col, flexShrink: 0, marginTop: 4,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{ev.event}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {ev.incident_id} · {ev.zone}
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{ev.t}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Zone Risk Map ──────────────────────────────────────────── */
function ZoneRiskMap({ incidents }) {
  const zones = [
    { name: 'Mixing Room',         x: 15,  y: 12,  w: 28, h: 22 },
    { name: 'Storage Vault',       x: 50,  y: 12,  w: 24, h: 22 },
    { name: 'Chemical Zone 3',     x: 78,  y: 12,  w: 20, h: 22 },
    { name: 'Electrical Room',     x: 15,  y: 42,  w: 22, h: 18 },
    { name: 'Production Line B',   x: 42,  y: 42,  w: 32, h: 18 },
    { name: 'Assembly Hall',       x: 15,  y: 68,  w: 40, h: 20 },
    { name: 'Main Dist. Board',    x: 60,  y: 42,  w: 20, h: 18 },
    { name: 'Zone 7 Compressor',   x: 60,  y: 68,  w: 28, h: 20 },
  ];
  const incidentMap = {};
  incidents.forEach(inc => { incidentMap[inc.zone] = inc; });

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={12} style={{ color: 'var(--cyan)' }} />
        <span className="section-label">Zone Risk Map</span>
      </div>
      <div className="relative rounded-lg overflow-hidden" style={{
        height: 180,
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(0,229,255,0.06)',
        backgroundImage: 'linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}>
        {zones.map((z) => {
          const inc = Object.keys(incidentMap).find(k => k.includes(z.name.split(' ')[0]) || z.name.includes(k.split(' ')[0]));
          const incident = inc ? incidentMap[inc] : null;
          const sev = incident ? SEV[incident.severity] : null;
          const isOpen = incident?.status === 'open';
          return (
            <motion.div
              key={z.name}
              style={{
                position: 'absolute',
                left: `${z.x}%`, top: `${z.y}%`,
                width: `${z.w}%`, height: `${z.h}%`,
                background: sev ? sev.bg : 'rgba(0,229,255,0.04)',
                border: `1px solid ${sev ? sev.border : 'rgba(0,229,255,0.08)'}`,
                borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'default',
              }}
              animate={isOpen && sev ? { boxShadow: [`0 0 0 0 ${sev.color}40`, `0 0 8px 4px ${sev.color}20`, `0 0 0 0 ${sev.color}40`] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <span style={{
                fontSize: 9, color: sev ? sev.color : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', textAlign: 'center',
                lineHeight: 1.3, padding: '0 3px',
              }}>
                {z.name.split(' ').slice(0, 2).join('\n')}
              </span>
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2">
        {['critical', 'high', 'medium', 'low'].map(s => (
          <div key={s} className="flex items-center gap-1">
            <div style={{ width: 6, height: 6, borderRadius: 2, background: SEV[s].color, opacity: 0.8 }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Summary Stats ──────────────────────────────────────────── */
function StatCard({ label, value, color, icon: Icon, sub }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
        {Icon && <Icon size={12} style={{ color }} />}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function IncidentReplay() {
  const { API_BASE } = useApp();
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/incidents?limit=100`);
      if (res.data.incidents && res.data.incidents.length > 0) {
        setIncidents(res.data.incidents);
      } else {
        setIncidents(MOCK_INCIDENTS);
      }
    } catch {
      setIncidents(MOCK_INCIDENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  const resolveIncident = async (id) => {
    try {
      await axios.patch(`${API_BASE}/api/incidents/${id}/resolve`);
    } catch {}
    setIncidents(prev => prev.map(i => i.incident_id === id ? { ...i, status: 'resolved' } : i));
  };

  const filtered = filter === 'all' ? incidents
    : filter === 'open' ? incidents.filter(i => i.status === 'open')
    : filter === 'resolved' ? incidents.filter(i => i.status === 'resolved')
    : incidents.filter(i => i.severity === filter);

  const open     = incidents.filter(i => i.status === 'open').length;
  const resolved = incidents.filter(i => i.status !== 'open').length;
  const critical = incidents.filter(i => i.severity === 'critical').length;
  const high     = incidents.filter(i => i.severity === 'high').length;
  const avgScore = (incidents.reduce((s, i) => s + (i.hazard_score || 0), 0) / Math.max(incidents.length, 1)).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Incident Replay</h1>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            AI-generated incident timeline · Click to expand · Real-time event feed
          </p>
        </div>
        <button onClick={fetchIncidents} className="btn-primary text-xs flex items-center gap-1.5">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard label="TOTAL" value={incidents.length} color="var(--cyan)" icon={BarChart2} sub="All incidents" />
        <StatCard label="OPEN" value={open} color="#F97316" icon={AlertOctagon} sub="Needs attention" />
        <StatCard label="RESOLVED" value={resolved} color="#22C55E" icon={CheckCircle} sub="Cleared safely" />
        <StatCard label="CRITICAL" value={critical} color="#EF4444" icon={Flame} sub="Highest severity" />
        <StatCard label="HIGH" value={high} color="#F97316" icon={AlertTriangle} sub="Elevated risk" />
        <StatCard label="AVG SCORE" value={`${avgScore}%`} color="#EAB308" icon={TrendingUp} sub="Hazard average" />
      </div>

      {/* Main 3-column layout */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 260px' }}>
        {/* Left: Filters + Incident List */}
        <div className="space-y-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={11} style={{ color: 'var(--text-muted)' }} />
            {['all', 'open', 'resolved', 'critical', 'high', 'medium', 'low'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-[12px] font-semibold transition-all"
                style={{
                  background: filter === f ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${filter === f ? 'var(--border-bright)' : 'var(--border-dim)'}`,
                  color: filter === f ? 'var(--cyan)' : 'var(--text-muted)',
                }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && <span style={{ marginLeft: 4, opacity: 0.6 }}>
                  ({f === 'open' ? open : f === 'resolved' ? resolved : f === 'critical' ? critical : f === 'high' ? high : incidents.filter(i => i.severity === f).length})
                </span>}
              </button>
            ))}
          </div>

          {/* Incident List */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {loading && (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>
                    <RefreshCw size={20} />
                  </motion.div>
                  <div className="mt-2 text-xs">Loading incidents...</div>
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-10 text-center">
                  <Shield size={32} style={{ color: '#22C55E', margin: '0 auto 12px' }} />
                  <div className="text-sm font-semibold" style={{ color: '#22C55E' }}>No incidents found</div>
                  <div className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {filter === 'all' ? 'System is running safely.' : `No ${filter} incidents.`}
                  </div>
                </motion.div>
              )}
              {!loading && filtered.map((incident, idx) => (
                <motion.div
                  key={incident.incident_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <IncidentCard
                    incident={incident}
                    onResolve={resolveIncident}
                    isSelected={selectedId === incident.incident_id}
                    onSelect={setSelectedId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <ZoneRiskMap incidents={incidents} />
          <ActivityFeed incidents={incidents} />

          {/* Camera Grid */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={12} style={{ color: 'var(--cyan)' }} />
              <span className="section-label">Zone Cameras</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {incidents.slice(0, 4).map(inc => (
                <CameraFeed key={inc.incident_id} zone={inc.zone} severity={inc.severity} isOpen={inc.status === 'open'} image={inc.cctv_image} label={inc.cctv_label} time={inc.cctv_time} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
