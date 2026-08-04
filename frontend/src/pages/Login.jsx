import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Eye, EyeOff, Zap } from 'lucide-react';

const DEMO_CREDS = [
  { email: 'admin@safefuse.ai',   password: 'SafeFuse2026', role: 'HSE Manager' },
  { email: 'safety@safefuse.ai',  password: 'Safety2026',   role: 'Safety Officer' },
  { email: 'manager@safefuse.ai', password: 'Manager2026',  role: 'Plant Manager' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (cred) => {
    setLoading(true);
    try {
      await login(cred.email, cred.password);
      navigate('/dashboard');
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-void)' }}>
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(0,229,255,1), transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,1), transparent)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-6">

        {/* Logo Block */}
        <div className="text-center mb-8">
          <motion.div animate={{ boxShadow: ['0 0 20px rgba(0,229,255,0.2)', '0 0 40px rgba(0,229,255,0.4)', '0 0 20px rgba(0,229,255,0.2)'] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(59,130,246,0.15))', border: '1px solid var(--border-bright)' }}>
            <ShieldAlert size={28} style={{ color: 'var(--cyan)' }} />
          </motion.div>
          <h1 className="text-2xl font-bold text-glow-cyan" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display)' }}>
            SAFE-FUSE AI
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Predictive AI-Powered Industrial Safety Intelligence
          </p>
          <p className="text-[10px] mt-1 font-mono" style={{ color: 'rgba(0,229,255,0.5)' }}>
            Predict · Explain · Act · Prevent
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-card-bright p-6 mb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="section-label block mb-1.5">Email Address</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-dim)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--border-bright)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
                placeholder="admin@safefuse.ai"
              />
            </div>
            <div>
              <label className="section-label block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none pr-10 transition-all"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-dim)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--border-bright)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
                  placeholder="••••••••••••"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </motion.div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-sm"
              style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(59,130,246,0.2))' }}>
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--cyan)', borderTopColor: 'transparent' }} />
              ) : (
                <>
                  <Zap size={14} />
                  Access Platform
                </>
              )}
            </button>
          </form>
        </div>

        {/* Quick Login */}
        <div className="glass-card p-4">
          <div className="section-label mb-3">Quick Demo Access</div>
          <div className="space-y-2">
            {DEMO_CREDS.map(cred => (
              <button key={cred.email} onClick={() => quickLogin(cred)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all hover:bg-[rgba(0,229,255,0.06)]"
                style={{ border: '1px solid var(--border-dim)', color: 'var(--text-secondary)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{cred.email}</span>
                <span className="badge badge-normal">{cred.role}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[9px] mt-4" style={{ color: 'var(--text-muted)' }}>
          CIH 2026 Hackathon Demo · SAFE-FUSE AI v1.0
        </p>
      </motion.div>
    </div>
  );
}
