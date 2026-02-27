import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getSession,
  signInWithPassword,
  signOut,
  onAuthStateChange,
  setOnUnauthorized,
} from '../lib/authClient';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api';

async function fetchMe(token: string): Promise<User | null> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json?.success || !json?.data) return null;
  const d = json.data;
  return {
    id: d.id,
    name: d.name ?? d.email ?? '',
    email: d.email ?? '',
    role: d.role === 'admin' ? 'admin' : 'user',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { session } = await getSession();
      if (!mounted) return;
      if (!session?.access_token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const me = await fetchMe(session.access_token);
      if (!mounted) return;
      setUser(me);
      setIsLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const sub = onAuthStateChange(async (_event, session) => {
      // If the user is on the set-password page (invite or reset flow),
      // do not process SIGNED_IN here — SetPasswordPage handles the session itself.
      if (window.location.pathname === '/set-password') {
        return;
      }
      if (!session?.access_token) {
        setUser(null);
        return;
      }
      const me = await fetchMe(session.access_token);
      setUser(me);
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await signInWithPassword({ email, password });
    if (error) throw new Error(error.message ?? 'Login failed');
    const token = data.session?.access_token;
    if (!token) throw new Error('No session');
    const me = await fetchMe(token);
    setUser(me);
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
