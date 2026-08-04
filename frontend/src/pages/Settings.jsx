import { useApp } from '../context/AppContext';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Wifi, Radio, Save, Users, Sliders, Database, AlertTriangle } from 'lucide-react';
import axios from 'axios';

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border-dim)' }}>
      <div>
        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, min, max }) {
  return (
    <input type="number" value={value} onChange={e => onChange(e.target.value)} min={min} max={max}
      className="w-20 px-2 py-1.5 rounded-lg text-xs text-right outline-none"
      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
      onFocus={e => e.target.style.borderColor = 'var(--border-bright)'}
      onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
    />
  );
}

export default function Settings() {
  const { hardwareMode, API_BASE, updateSettings } = useApp();
  const [mqttBroker, setMqttBroker]     = useState('localhost');
  const [mqttPort, setMqttPort]         = useState(1883);
  const [simMode, setSimMode]           = useState(hardwareMode === 'simulation');
  const [updateInterval, setInterval]   = useState(2);
  const [saved, setSaved]               = useState(false);
  const [thresholds, setThresholds]     = useState({
    temperature_warn: 45, temperature_critical: 60,
    humidity_warn: 30, humidity_critical: 20,
    smoke_warn: 150, smoke_critical: 300,
    gas_warn: 200, gas_critical: 400,
    dust_warn: 100, dust_critical: 250,
    current_warn: 12, current_critical: 18,
  });

  const handleSave = async () => {
    try {
      await updateSettings({
        simulation_mode: simMode,
        mqtt_broker: mqttBroker,
        mqtt_port: parseInt(mqttPort),
      });
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setThresh = (key, val) => setThresholds(prev => ({ ...prev, [key]: parseFloat(val) }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          System configuration · MQTT · Hardware mode · Alert thresholds
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* System Settings */}
        <div className="col-span-6 space-y-3">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Radio size={14} style={{ color: 'var(--cyan)' }} />
              <span className="section-label">Hardware Mode</span>
            </div>
            <SettingRow label="Simulation Mode" description="Use virtual sensor data instead of ESP32 hardware">
              <button onClick={() => setSimMode(s => !s)}
                className={`relative w-12 h-6 rounded-full transition-colors flex items-center`}
                style={{ background: simMode ? 'rgba(124,58,237,0.4)' : 'rgba(0,229,255,0.25)', border: `1px solid ${simMode ? 'rgba(124,58,237,0.5)' : 'rgba(0,229,255,0.4)'}` }}>
                <motion.div animate={{ x: simMode ? 2 : 24 }}
                  className="w-5 h-5 rounded-full absolute"
                  style={{ background: simMode ? '#A855F7' : 'var(--cyan)' }} />
              </button>
            </SettingRow>
            <SettingRow label="Current Mode" description="">
              <span className={`badge ${hardwareMode === 'hardware' ? 'badge-hw' : 'badge-sim'}`}>
                {hardwareMode === 'hardware' ? 'ESP32 Hardware' : 'Simulation'}
              </span>
            </SettingRow>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wifi size={14} style={{ color: 'var(--cyan)' }} />
              <span className="section-label">MQTT Configuration</span>
            </div>
            <SettingRow label="Broker Address" description="IP/hostname of MQTT broker (Mosquitto)">
              <input value={mqttBroker} onChange={e => setMqttBroker(e.target.value)}
                className="w-36 px-2 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }} />
            </SettingRow>
            <SettingRow label="Broker Port" description="Default: 1883">
              <NumberInput value={mqttPort} onChange={setMqttPort} min={1} max={65535} />
            </SettingRow>
            <SettingRow label="Topic Prefix" description="MQTT topic: safefuse/sensors/data">
              <span className="text-[12px] font-mono" style={{ color: 'var(--cyan)' }}>safefuse/#</span>
            </SettingRow>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={14} style={{ color: 'var(--cyan)' }} />
              <span className="section-label">System</span>
            </div>
            <SettingRow label="Update Interval" description="Sensor polling & broadcast interval">
              <div className="flex items-center gap-1.5">
                <NumberInput value={updateInterval} onChange={setInterval} min={1} max={10} />
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>sec</span>
              </div>
            </SettingRow>
            <SettingRow label="Database" description="SQLite (development) — SafeFuse.db">
              <span className="text-[12px] font-mono" style={{ color: 'var(--cyan)' }}>safefuse.db</span>
            </SettingRow>
          </div>
        </div>

        {/* Threshold Settings */}
        <div className="col-span-6 space-y-3">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sliders size={14} style={{ color: 'var(--cyan)' }} />
              <span className="section-label">Alert Thresholds</span>
            </div>
            <div className="text-[11px] mb-3 p-2 rounded-lg" style={{ background: 'rgba(249,115,22,0.08)', color: '#F97316', border: '1px solid rgba(249,115,22,0.2)' }}>
              <AlertTriangle size={10} className="inline mr-1" />
              Changes apply to next AI evaluation cycle (2 seconds)
            </div>

            {[
              { key: 'temperature', label: 'Temperature', unit: '°C' },
              { key: 'humidity',    label: 'Humidity (LOW danger)', unit: '%' },
              { key: 'smoke',       label: 'Smoke (MQ-2)', unit: 'ppm' },
              { key: 'gas',         label: 'Gas (MQ-135)', unit: 'ppm' },
              { key: 'dust',        label: 'Dust Density', unit: 'µg/m³' },
              { key: 'current',     label: 'Current (ACS712)', unit: 'A' },
            ].map(({ key, label, unit }) => (
              <div key={key} className="py-2.5 border-b" style={{ borderColor: 'var(--border-dim)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{unit}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]" style={{ color: '#F97316' }}>Warn</span>
                    <NumberInput value={thresholds[`${key}_warn`]} onChange={v => setThresh(`${key}_warn`, v)} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]" style={{ color: '#EF4444' }}>Critical</span>
                    <NumberInput value={thresholds[`${key}_critical`]} onChange={v => setThresh(`${key}_critical`, v)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Demo Users */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} style={{ color: 'var(--cyan)' }} />
              <span className="section-label">Demo Users</span>
            </div>
            <div className="space-y-1.5">
              {[
                { email: 'admin@safefuse.ai',   role: 'HSE Manager',    password: 'SafeFuse2026' },
                { email: 'safety@safefuse.ai',  role: 'Safety Officer', password: 'Safety2026' },
                { email: 'manager@safefuse.ai', role: 'Plant Manager',  password: 'Manager2026' },
              ].map(u => (
                <div key={u.email} className="flex items-center justify-between text-[12px] py-1.5 border-b"
                  style={{ borderColor: 'var(--border-dim)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{u.email}</span>
                  <span className="badge badge-sim">{u.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <motion.button onClick={handleSave}
          whileTap={{ scale: 0.97 }}
          className="btn-primary px-6 py-2.5 text-sm"
          style={{ background: saved ? 'rgba(34,197,94,0.2)' : undefined, borderColor: saved ? 'rgba(34,197,94,0.4)' : undefined }}>
          {saved ? '✅ Saved!' : <><Save size={14} /> Save Settings</>}
        </motion.button>
      </div>
    </div>
  );
}
