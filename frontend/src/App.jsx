import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DigitalTwin from './pages/DigitalTwin';
import AIBrain from './pages/AIBrain';
import HardwareMonitor from './pages/HardwareMonitor';
import IncidentReplay from './pages/IncidentReplay';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] React crash:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#040810', color: '#00E5FF', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ color: '#EF4444', fontSize: '20px', marginBottom: '8px' }}>SAFE-FUSE AI — UI Crash Guard</h2>
          <p style={{ color: '#94A3B8', marginBottom: '16px' }}>An unexpected component rendering error occurred.</p>
          <pre style={{ background: '#0D1526', color: '#F87171', padding: '16px', borderRadius: '8px', border: '1px solid #1E293B', maxWidth: '600px', overflowX: 'auto', textAlign: 'left' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} style={{ marginTop: '20px', background: '#00E5FF', color: '#040810', padding: '10px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Reset App & Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="twin"       element={<DigitalTwin />} />
        <Route path="ai-brain"   element={<AIBrain />} />
        <Route path="hardware"   element={<HardwareMonitor />} />
        <Route path="incidents"  element={<IncidentReplay />} />
        <Route path="reports"    element={<Reports />} />
        <Route path="settings"   element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <div className="scanline" />
            <AppRoutes />
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
