'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
    email: string;
    displayName: string;
    photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  login: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const contentType = res.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setUser(data.user);
        setIsAdmin(data.isAdmin);
      } else {
        const text = await res.text();
        console.error("Non-JSON response from auth session:", text.substring(0, 100));
        throw new Error('Non-JSON response received');
      }
    } catch (err: any) {
      console.error("Session check failed", err.message);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Run lazy migrations
      fetch('/api/migrate').catch(() => {});
      await checkSession();
    };
    init();
  }, []);

  const login = async (username?: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          await checkSession();
          return true;
        }
      }
    } catch (error) {
      console.error("Login failed", error);
    }
    return false;
  };

  const logout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
