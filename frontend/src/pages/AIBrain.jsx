import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell
} from 'recharts';
import { Brain, Zap, Shield, AlertTriangle, ChevronRight, Clock } from 'lucide-react';

// ─── SHAP Bar Chart ────────────────────────────────────────────────────────
function SHAPChart({ shapValues }) {
  if (!shapValues.length) return null;
  const data = shapValues.map(s => ({
    name: s.sensor?.split('(')[0].trim() || s.sensor_key,
    contribution: s.contribution,
    direction: s.direction,
    value: `${s.value}${s.unit}`,
  }));

  const barColor = (direction) => {
    if (direction === 'danger') return '#EF4444';
    if (direction === 'caution') return '#F97316';
    return '#22C55E';
  };

  return (
    <div>
      <div className="section-label mb-3">SHAP Feature Contributions</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" domain={[0, 'dataMax']} tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={120} />
          <Tooltip
            contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 6, fontSize: 10 }}
            formatter={(val, name, props) => [`${val.toFixed(2)}% contribution`, props.payload.value]}
          />
          <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.direction)} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Sensor detail rows */}
      <div className="space-y-1.5 mt-3">
        {shapValues.slice(0, 5).map((s, i) => {
          const c = s.direction === 'danger' ? '#EF4444' : s.direction === 'caution' ? '#F97316' : '#22C55E';
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{s.sensor}</span>
                  <span className="text-[10px] font-mono" style={{ color: c }}>
                    {s.value}{s.unit} · {s.contribution?.toFixed(2)}%
                  </span>
                </div>
                <div className="progress-track">
                  <motion.div className="progress-fill" style={{ background: c }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, s.danger_pct)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Decision Flow ─────────────────────────────────────────────────────────
function DecisionFlow({ reasoning, decidedActions }) {
  return (
    <div>
      <div className="section-label mb-3">Agentic Reasoning Chain</div>
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {reasoning.map((step, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-start gap-3 p-2.5 rounded-lg"
              style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.08)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5"
                style={{ background: 'rgba(0,229,255,0.15)', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', border: '1px solid rgba(0,229,255,0.3)' }}>
                {i + 1}
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        {reasoning.length === 0 && (
          <div className="text-[11px] text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Waiting for AI reasoning data...
          </div>
        )}
      </div>

      {decidedActions.length > 0 && (
        <div className="mt-4">
          <div className="section-label mb-2">Decided Actions</div>
          <div className="space-y-1.5">
            {decidedActions.map((a, i) => {
              const pColor = a.priority === 0 ? '#EF4444' : a.priority === 1 ? '#F97316' : '#22C55E';
              return (
                <motion.div key={i}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 py-1.5 px-3 rounded-lg"
                  style={{ background: `${pColor}0D`, border: `1px solid ${pColor}25` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: pColor }} />
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold" style={{ color: pColor }}>{a.label}</span>
                    <span className="text-[9px] ml-2" style={{ color: 'var(--text-muted)' }}>{a.device} → {a.action}</span>
                  </div>
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>P{a.priority}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIBrain() {
  const {
    hazardScore, riskLevel, safetyScore, confidence,
    shapValues, triggeredRules, reasoning, decidedActions,
    sensorHistory, scoreColor,
  } = useApp();
  const color = scoreColor(hazardScore);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>AI Brain</h1>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Reasoning · SHAP Explainability · Confidence · Decision Flow
        </p>
      </div>

      {/* ─── Top Row: Score + Confidence + Model Info ──────────── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Score + Confidence */}
        <div className="col-span-4 glass-card-bright p-5 flex flex-col items-center gap-3"
          style={{ borderColor: `${color}30` }}>
          <div className="section-label">Hazard Score</div>
          {/* Big animated number */}
          <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
            <svg viewBox="0 0 140 140" width="140" height="140" className="absolute">
              <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 58 * 0.75} ${2 * Math.PI * 58}`}
                strokeDashoffset={`${-2 * Math.PI * 58 * 0.125}`}
                strokeLinecap="round" transform="rotate(135 70 70)" />
              <motion.circle cx="70" cy="70" r="58" fill="none" stroke={color} strokeWidth="10"
                strokeLinecap="round" transform="rotate(135 70 70)"
                animate={{ strokeDasharray: `${(hazardScore / 100) * 2 * Math.PI * 58 * 0.75} ${2 * Math.PI * 58}` }}
                style={{ strokeDashoffset: `${-2 * Math.PI * 58 * 0.125}`, filter: `drop-shadow(0 0 10px ${color})`, transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div className="text-center z-10">
              <div className="text-4xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>
                {hazardScore.toFixed(0)}
              </div>
              <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>/ 100</div>
            </div>
          </div>
          <div className={`badge badge-${riskLevel} text-xs`}>{riskLevel.toUpperCase()}</div>
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[10px]">
              <span style={{ color: 'var(--text-muted)' }}>AI Confidence</span>
              <span style={{ color: 'var(--cyan)' }}>{confidence}%</span>
            </div>
            <div className="progress-track">
              <motion.div className="progress-fill" style={{ background: 'var(--cyan)' }}
                animate={{ width: `${confidence}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[10px]">
              <span style={{ color: 'var(--text-muted)' }}>Safety Score</span>
              <span style={{ color: '#22C55E' }}>{safetyScore.toFixed(0)}%</span>
            </div>
            <div className="progress-track">
              <motion.div className="progress-fill" style={{ background: '#22C55E' }}
                animate={{ width: `${safetyScore}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
        </div>

        {/* SHAP Chart */}
        <div className="col-span-5 glass-card p-4">
          <SHAPChart shapValues={shapValues} />
        </div>

        {/* Compound Rules + Model Info */}
        <div className="col-span-3 space-y-3">
          <div className="glass-card p-4">
            <div className="section-label mb-3">Compound Rules Triggered</div>
            {triggeredRules.length === 0 ? (
              <div className="flex items-center gap-2 py-2">
                <Shield size={14} style={{ color: '#22C55E' }} />
                <span className="text-[10px]" style={{ color: '#22C55E' }}>No compound hazards</span>
              </div>
            ) : (
              <div className="space-y-2">
                {triggeredRules.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="text-[10px] font-bold" style={{ color: '#EF4444' }}>{r.label}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.description?.slice(0, 60)}...</div>
                    <div className="text-[9px] mt-1" style={{ color: '#F97316' }}>+{r.bonus} bonus score</div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          <div className="glass-card p-4">
            <div className="section-label mb-2">Model Info</div>
            <div className="space-y-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <div className="flex justify-between"><span>Engine</span><span style={{ color: 'var(--cyan)' }}>Compound Risk AI</span></div>
              <div className="flex justify-between"><span>Sensors</span><span style={{ color: 'var(--cyan)' }}>7 types</span></div>
              <div className="flex justify-between"><span>Compound Rules</span><span style={{ color: 'var(--cyan)' }}>6 active</span></div>
              <div className="flex justify-between"><span>Update Rate</span><span style={{ color: 'var(--cyan)' }}>2s</span></div>
              <div className="flex justify-between"><span>XAI Method</span><span style={{ color: 'var(--cyan)' }}>SHAP-style</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Row 2: Hazard History + Reasoning Flow ────────────── */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5 glass-card p-4">
          <div className="section-label mb-2">Hazard Score History (2 min)</div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={sensorHistory.hazard_score.slice(-60)}>
              <defs>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} axisLine={false} interval={9} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 6, fontSize: 10 }} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#aiGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-7 glass-card p-4">
          <DecisionFlow reasoning={reasoning} decidedActions={decidedActions} />
        </div>
      </div>
    </div>
  );
}
