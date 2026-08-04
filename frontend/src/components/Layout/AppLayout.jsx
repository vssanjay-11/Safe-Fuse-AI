import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, Box, Brain, Cpu, Clock, FileText, Settings,
  Wifi, WifiOff, LogOut, Flame, ShieldAlert, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Mission Control',   desc: 'Live overview' },
  { to: '/twin',      icon: Box,             label: 'Digital Twin',       desc: '3D Factory' },
  { to: '/ai-brain',  icon: Brain,           label: 'AI Brain',           desc: 'Reasoning + SHAP' },
  { to: '/hardware',  icon: Cpu,             label: 'Hardware Monitor',   desc: 'Sensors + Relays' },
  { to: '/incidents', icon: Clock,           label: 'Incident Replay',    desc: 'Timeline' },
  { to: '/reports',   icon: FileText,        label: 'Reports',            desc: 'PDF Generation' },
  { to: '/settings',  icon: Settings,        label: 'Settings',           desc: 'Config + MQTT' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { hazardScore, riskLevel, connected, hardwareMode, flameDetected, scoreColor, riskColor } = useApp();
  const color = scoreColor(hazardScore);
  const rColor = riskColor(riskLevel);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-void)' }}>
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex flex-col"
        style={{ background: 'var(--bg-panel)', borderRight: '1px solid var(--border-dim)' }}>

        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-dim)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(59,130,246,0.2))', border: '1px solid var(--border-bright)' }}>
              <ShieldAlert size={14} className="text-cyan" style={{ color: 'var(--cyan)' }} />
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>SAFE-FUSE AI</div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>v1.0.0</div>
            </div>
          </div>
        </div>

        {/* Hazard Score Mini */}
        <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border-dim)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Hazard Score</div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold font-mono" style={{ color, fontFamily: 'var(--font-mono)' }}>
              {hazardScore.toFixed(0)}
            </span>
            <span className="text-[12px] mb-1" style={{ color: 'var(--text-muted)' }}>/100</span>
            <span className={`badge badge-${riskLevel} ml-auto text-[10px]`}>{riskLevel}</span>
          </div>
          <div className="progress-track mt-1.5">
            <div className="progress-fill" style={{ width: `${hazardScore}%`, background: color, transition: 'width 1s ease' }} />
          </div>

          {flameDetected && (
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.6 }}
              className="flex items-center gap-1 mt-2 text-[12px]" style={{ color: '#EF4444' }}>
              <Flame size={10} />
              <span className="font-bold">FLAME DETECTED</span>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, desc }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                 ${isActive ? 'nav-active' : 'hover:bg-[rgba(0,229,255,0.04)]'}`
              }>
              {({ isActive }) => (
                <>
                  <Icon size={15} style={{ color: isActive ? 'var(--cyan)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div className="text-[13px] font-semibold leading-none"
                      style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {label}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: User + Status */}
        <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--border-dim)' }}>
          {/* HW Mode */}
          <div className="flex items-center gap-2">
            <Radio size={10} style={{ color: hardwareMode === 'hardware' ? 'var(--safe)' : 'var(--purple)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {hardwareMode === 'hardware' ? 'Hardware Mode' : 'Simulation Mode'}
            </span>
          </div>
          {/* WS Status */}
          <div className="flex items-center gap-2">
            {connected
              ? <Wifi size={10} className="text-safe" style={{ color: 'var(--safe)' }} />
              : <WifiOff size={10} style={{ color: 'var(--danger)' }} />}
            <span className="text-[11px]" style={{ color: connected ? 'var(--safe)' : 'var(--danger)' }}>
              {connected ? 'Live Connected' : 'Reconnecting...'}
            </span>
          </div>
          {/* User */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{user?.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{user?.role}</div>
            </div>
            <button onClick={logout} className="p-1 rounded hover:bg-[rgba(239,68,68,0.1)] transition-colors">
              <LogOut size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-5 py-2.5"
          style={{ background: 'rgba(8,13,26,0.8)', borderBottom: '1px solid var(--border-dim)', backdropFilter: 'blur(8px)' }}>
          <div className="text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>
            SAFE-FUSE AI · Industrial Safety Intelligence Platform
          </div>
          <div className="flex items-center gap-4 text-[12px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>CIH 2026</span>
            <span style={{ color: 'var(--border-normal)' }}>|</span>
            <span>Predict · Explain · Act · Prevent</span>
            <span style={{ color: 'var(--border-normal)' }}>|</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-hidden p-4 grid-bg">
          <div className="page-scroll h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
