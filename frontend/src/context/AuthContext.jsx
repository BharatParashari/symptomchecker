import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const profile = await api.me();
      setUser(profile);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const { user: u, token } = await api.login({ email, password });
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const registerPatient = async (data) => {
    const { user: u, token } = await api.registerPatient(data);
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  };

  const registerDoctor = async (data) => {
    const { user: u, token } = await api.registerDoctor(data);
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, registerPatient, registerDoctor, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
