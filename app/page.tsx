'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, LogOut, Users, BarChart2, Server, Settings as SettingsIcon } from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import DashboardView from '@/components/views/dashboard-view';
import { UsersView } from '@/components/views/users-view';
import SessionsView from '@/components/views/sessions-view';
import SettingsView from '@/components/views/settings-view';

type Tab = 'dashboard' | 'users' | 'sessions' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'users',     label: 'Users',     icon: Users },
  { id: 'sessions',  label: 'Sessions',  icon: Server },
  { id: 'settings',  label: 'Settings',  icon: SettingsIcon },
];

function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await login(username, password);
    if (!ok) setError('Invalid username or password.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Power VPN</h1>
          <p className="text-slate-400 text-sm mt-1">Admin Panel</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl py-3 font-semibold transition-all active:scale-95 text-sm"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </motion.form>
    </div>
  );
}

function AdminPanel() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 flex flex-col shrink-0">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-wide">Power VPN</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-3 mx-3 mb-4 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 text-sm font-medium transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'users'     && <UsersView />}
              {activeTab === 'sessions'  && <SessionsView />}
              {activeTab === 'settings'  && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-sm font-medium animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      {user ? <AdminPanel /> : <LoginPage />}
    </>
  );
}
