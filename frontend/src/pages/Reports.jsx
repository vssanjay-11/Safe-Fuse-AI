import { useApp } from '../context/AppContext';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, BarChart2, Shield, Cpu } from 'lucide-react';
import axios from 'axios';

const REPORT_TYPES = [
  {
    id: 'safety_summary',
    label: 'Safety Summary Report',
    description: 'Current hazard assessment, sensor readings, AI decisions, and open incidents',
    icon: Shield,
    color: '#22C55E',
  },
  {
    id: 'incident',
    label: 'Incident Report',
    description: 'Complete incident timeline with AI reasoning, sensor snapshots, and actions',
    icon: BarChart2,
    color: '#F97316',
  },
  {
    id: 'hardware',
    label: 'Hardware Status Report',
    description: 'All sensor values, relay states, and hardware connectivity status',
    icon: Cpu,
    color: 'var(--cyan)',
  },
];

export default function Reports() {
  const { hazardScore, riskLevel, aggregate, relayStatus, API_BASE } = useApp();
  const [selectedType, setSelectedType] = useState('safety_summary');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/report?report_type=${selectedType}`);
      setReportData(res.data);
    } catch (err) {
      // Offline fallback
      setReportData({
        report_id: `RPT-${Date.now()}`,
        report_type: selectedType,
        generated_at: new Date().toISOString(),
        plant: 'SAFE-FUSE AI Demo Plant',
        generated_by: 'SAFE-FUSE AI System',
        title: REPORT_TYPES.find(r => r.id === selectedType)?.label || 'Report',
        summary: `Hazard Score: ${hazardScore.toFixed(1)}% (${riskLevel.toUpperCase()}). Generated in offline mode.`,
        content: { note: 'Backend not running — data from live WebSocket state', aggregate, relay_status: relayStatus },
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.report_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTXT = () => {
    if (!reportData) return;
    const lines = [
      '=' .repeat(60),
      `  ${reportData.title}`,
      '='.repeat(60),
      `Report ID:    ${reportData.report_id}`,
      `Generated At: ${new Date(reportData.generated_at).toLocaleString()}`,
      `Plant:        ${reportData.plant}`,
      `By:           ${reportData.generated_by}`,
      '',
      'SUMMARY',
      '-'.repeat(40),
      reportData.summary,
      '',
      'CONTENT',
      '-'.repeat(40),
      JSON.stringify(reportData.content, null, 2),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.report_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Reports</h1>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Generate AI-compiled safety reports from live data
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Report Type Selector */}
        <div className="col-span-5 space-y-3">
          <div className="section-label">Select Report Type</div>
          {REPORT_TYPES.map(type => (
            <motion.div key={type.id} whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedType(type.id)}
              className="glass-card p-4 cursor-pointer transition-all"
              style={{ borderColor: selectedType === type.id ? `${type.color}40` : 'var(--border-dim)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${type.color}15`, border: `1px solid ${type.color}30` }}>
                  <type.icon size={16} style={{ color: type.color }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{type.label}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{type.description}</div>
                </div>
                {selectedType === type.id && <CheckCircle size={14} style={{ color: type.color }} />}
              </div>
            </motion.div>
          ))}

          <button onClick={generateReport} disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm">
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--cyan)', borderTopColor: 'transparent' }} />
              : <><FileText size={14} /> Generate Report</>
            }
          </button>
        </div>

        {/* Report Preview */}
        <div className="col-span-7 glass-card p-5">
          {!reportData ? (
            <div className="h-full flex flex-col items-center justify-center" style={{ minHeight: 300 }}>
              <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <div className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No report generated</div>
              <div className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>Select a report type and click Generate</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{reportData.title}</h2>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {reportData.report_id} · {new Date(reportData.generated_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={downloadTXT} className="btn-primary text-[12px]">
                    <Download size={10} /> .txt
                  </button>
                  <button onClick={downloadJSON} className="btn-primary text-[12px]">
                    <Download size={10} /> .json
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg text-[13px] leading-relaxed"
                style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', color: 'var(--text-secondary)' }}>
                {reportData.summary}
              </div>

              <div>
                <div className="section-label mb-2">Report Content (JSON)</div>
                <div className="p-3 rounded-lg overflow-auto text-[11px] font-mono leading-relaxed"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)',
                    color: '#94A3B8', maxHeight: 300, fontFamily: 'var(--font-mono)' }}>
                  <pre>{JSON.stringify(reportData.content, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
