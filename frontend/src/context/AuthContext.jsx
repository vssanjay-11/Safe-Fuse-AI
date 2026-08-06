import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')
);

// Demo credentials (also validated on backend)
const DEMO_USERS = [
  { email: 'admin@safefuse.ai',   password: 'SafeFuse2026', name: 'Rajesh Kumar',   role: 'HSE Manager',    id: '1' },
  { email: 'safety@safefuse.ai',  password: 'Safety2026',   name: 'Dr. Priya Sharma', role: 'Safety Officer', id: '2' },
  { email: 'manager@safefuse.ai', password: 'Manager2026',  name: 'Vikram Nair',    role: 'Plant Manager',  id: '3' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; }
  });

  const login = async (email, password) => {
    // Try backend first
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
      const u = res.data.user;
      setUser(u);
      localStorage.setItem('sf_user', JSON.stringify(u));
      localStorage.setItem('sf_token', res.data.token);
      return u;
    } catch {
      // Fallback to local check (offline mode)
      const match = DEMO_USERS.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (!match) throw new Error('Invalid credentials');
      const u = { id: match.id, email: match.email, name: match.name, role: match.role };
      setUser(u);
      localStorage.setItem('sf_user', JSON.stringify(u));
      return u;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sf_user');
    localStorage.removeItem('sf_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
