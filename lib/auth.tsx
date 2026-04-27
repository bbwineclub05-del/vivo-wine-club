'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const MOCK_EMAIL    = 'member@vivowineclub.it';
const MOCK_PASSWORD = 'vivo2024';
const STORAGE_KEY   = 'vivo_member_session';

export interface AuthUser {
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore malformed data
    }
  }, []);

  function login(email: string, password: string): boolean {
    if (email.trim().toLowerCase() === MOCK_EMAIL && password === MOCK_PASSWORD) {
      const u: AuthUser = { email: MOCK_EMAIL, name: 'Vivo Member' };
      setUser(u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      return true;
    }
    return false;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
