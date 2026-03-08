import React, { createContext, useContext, useEffect, useState } from 'react';
import { PaletteMode } from '@mui/material';
import { useThemeCtx } from './ThemeContext';
import { API_BASE } from '../api/client';

export interface User {
  name: string;
  email: string;
  picture: string;
  theme?: PaletteMode;
  mcpKey?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setMode } = useThemeCtx();

  const applyTheme = (u: User) => {
    if (u.theme) setMode(u.theme);
  };

  useEffect(() => {
    fetch(`${API_BASE}/me`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.email) {
          setUser(data);
          applyTheme(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (token: string) => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Login failed:', res.status, text);
      return;
    }
    const data = await res.json();
    if (data?.email) {
      setUser(data);
      applyTheme(data);
    }
  };

  const logout = async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
