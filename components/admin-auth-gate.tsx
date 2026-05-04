'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export function AdminAuthGate({ children }: Props) {
  const [status, setStatus] = useState<'checking' | 'unauthenticated' | 'authenticated'>('checking');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const data = await res.json();
      setStatus(data.isAdmin ? 'authenticated' : 'unauthenticated');
    } catch {
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Authentication failed');
      }
      setStatus('authenticated');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
    setStatus('unauthenticated');
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.form
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onSubmit={handleLogin}
          className="bg-white max-w-sm w-full rounded-2xl shadow-xl border border-slate-200 p-8"
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield size={24} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Power VPN Admin</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to manage the panel.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white rounded-xl py-3 mt-8 font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <>
      {children}
      <button
        onClick={handleLogout}
        className="fixed bottom-4 left-4 z-50 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:text-red-600 hover:border-red-200 shadow-sm transition-colors"
      >
        Sign out
      </button>
    </>
  );
}
