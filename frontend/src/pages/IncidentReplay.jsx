import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Flame, Wind, Zap, Shield, CheckCircle, Clock, Filter } from 'lucide-react';
import axios from 'axios';

const SEVERITY_ICON = {
  critical: Flame,
  high:     AlertTriangle,
  medium:   Wind,
  low:      Shield,
};

const TYPE_ICON = {
  fire:         Flame,
  dust_explosion: Wind,
  ignition_risk:  AlertTriangle,
  gas_leak:       Wind,
  electrical:     Zap,
  general_hazard: Shield,
};

function IncidentCard({ incident, onResolve }) {
  const [expanded, setExpanded] = useState(false);
  const SevIcon = SEVERITY_ICON[incident.severity] || Shield;
  const sevColor = incident.severity === 'critical' ? '#EF4444' : incident.severity === 'high' ? '#F97316' : incident.severity === 'medium' ? '#EAB308' : '#22C55E';
  const isOpen = incident.status === 'open';

  return (
    <motion.div layout
      className="glass-card overflow-hidden"
      style={{ borderColor: isOpen ? `${sevColor}25` : 'var(--border-dim)' }}>
      {/* Header */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${sevColor}15`, border: `1px solid ${sevColor}30` }}>
            <SevIcon size={16} style={{ color: sevColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[11px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {incident.title}
              </h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`badge badge-${incident.severity}`} style={{ fontSize: 9 }}>{incident.severity}</span>
                <span className={`badge ${isOpen ? 'badge-warning' : 'badge-normal'}`} style={{ fontSize: 9 }}>
                  {incident.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{incident.incident_id}</span>
              <span>·</span>
              <span>{incident.zone}</span>
              <span>·</span>
              <span>{new Date(incident.timestamp).toLocaleString()}</span>
              <span>·</span>
              <span>Score: {incident.hazard_score?.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t" style={{ borderColor: 'var(--border-dim)' }}>
            <div className="p-4 space-y-4">
              {/* AI Reasoning */}
              <div>
                <div className="section-label mb-1.5">AI Reasoning</div>
                <div className="p-3 rounded-lg text-[10px] leading-relaxed"
                  style={{ background: 'rgba(0,229,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(0,229,255,0.08)', fontFamily: 'var(--font-mono)' }}>
                  {incident.ai_reasoning}
                </div>
              </div>

              {/* Sensor Snapshot */}
              <div>
                <div className="section-label mb-1.5">Sensor Snapshot at Incident</div>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(incident.sensor_snapshot || {}).map(([k, v]) => {
                    if (v === null || v === undefined) return null;
                    return (
                      <div key={k} className="px-2 py-1.5 rounded-lg text-center"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)' }}>
                        <div className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{k.replace(/_/g, ' ')}</div>
                        <div className="text-[11px] font-bold font-mono mt-0.5"
                          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {typeof v === 'boolean' ? (v ? 'YES' : 'NO') : v?.toFixed?.(1) ?? v}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions Taken */}
              {incident.actions_taken?.length > 0 && (
                <div>
                  <div className="section-label mb-1.5">AI Actions Taken</div>
                  <div className="flex flex-wrap gap-1.5">
                    {incident.actions_taken.map((a, i) => (
                      <span key={i} className="badge badge-hw text-[9px]">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolve Button */}
              {isOpen && (
                <button onClick={() => onResolve(incident.incident_id)}
                  className="btn-success flex items-center gap-1.5 text-xs">
                  <CheckCircle size={12} />
                  Mark as Resolved
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function IncidentReplay() {
  const { API_BASE } = useApp();
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/incidents?limit=100`);
      setIncidents(res.data.incidents || []);
    } catch {
      // Backend not running — show empty state
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  const resolveIncident = async (id) => {
    try {
      await axios.patch(`${API_BASE}/api/incidents/${id}/resolve`);
      setIncidents(prev => prev.map(i => i.incident_id === id ? { ...i, status: 'resolved' } : i));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filter === 'all' ? incidents
    : filter === 'open' ? incidents.filter(i => i.status === 'open')
    : incidents.filter(i => i.severity === filter);

  const open     = incidents.filter(i => i.status === 'open').length;
  const resolved = incidents.filter(i => i.status !== 'open').length;
  const critical = incidents.filter(i => i.severity === 'critical').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Incident Replay</h1>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            AI-generated incident timeline · Click to expand · Filter by severity
          </p>
        </div>
        <button onClick={fetchIncidents} className="btn-primary text-xs">
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Incidents', value: incidents.length, color: 'var(--cyan)' },
          { label: 'Open',     value: open,     color: '#F97316' },
          { label: 'Resolved', value: resolved, color: '#22C55E' },
          { label: 'Critical', value: critical, color: '#EF4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className="text-2xl font-bold font-mono" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter size={12} style={{ color: 'var(--text-muted)' }} />
        {['all', 'open', 'critical', 'high', 'medium', 'low'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              background: filter === f ? 'rgba(0,229,255,0.15)' : 'transparent',
              border: `1px solid ${filter === f ? 'var(--border-bright)' : 'var(--border-dim)'}`,
              color: filter === f ? 'var(--cyan)' : 'var(--text-muted)',
            }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Incident List */}
      <div className="space-y-2">
        <AnimatePresence>
          {loading && (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading incidents...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="glass-card p-10 text-center">
              <Shield size={32} style={{ color: '#22C55E', margin: '0 auto 12px' }} />
              <div className="text-sm font-semibold" style={{ color: '#22C55E' }}>No incidents found</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {filter === 'all' ? 'System is running safely. Incidents are auto-generated when hazard score exceeds 60%.' : `No ${filter} incidents.`}
              </div>
            </div>
          )}
          {!loading && filtered.map(incident => (
            <motion.div key={incident.incident_id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <IncidentCard incident={incident} onResolve={resolveIncident} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
