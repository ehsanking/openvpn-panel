'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import {
  Users,
  Activity,
  Settings as SettingsIcon,
  LogOut,
  Shield,
  Zap,
  Menu,
  X,
  LayoutDashboard,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components (defined later or imported)
import DashboardView from '@/components/views/dashboard-view';
import UsersView from '@/components/views/users-view';
import SessionsView from '@/components/views/sessions-view';
import SettingsView from '@/components/views/settings-view';

type View = 'dashboard' | 'users' | 'sessions' | 'settings';

export default function Home() {
  const { user, isAdmin, loading, login, logout } = useAuth();
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(username, password);
    if (!success) {
      setError('Invalid credentials. Check your .env setup.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-pulse font-bold tracking-widest uppercase text-xs">Initializing Secure Node...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
              <Key size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-white mb-2 tracking-tight flex items-center justify-center gap-2">
            <Zap className="text-yellow-400" size={32} fill="currentColor" /> Power VPN
          </h1>
          <p className="text-slate-500 text-center text-xs mb-8 font-medium uppercase tracking-widest">Instance Management</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-orange-500 transition-all text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-orange-500 transition-all text-sm font-mono"
                required
              />
            </div>

            {error && (
                <p className="text-[10px] font-bold text-red-500 text-center uppercase tracking-wide">{error}</p>
            )}

            <button 
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95 text-sm uppercase tracking-widest"
            >
                Authorize Access
            </button>
          </form>
          
          <div className="mt-8 text-center text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
            Authorized Node Operators Only
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 px-4">
        <div className="max-w-md text-center">
          <Zap className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-neutral-400 mb-6">
            Your account ({user.email}) is not authorized to access this panel.
          </p>
          <button 
            onClick={logout}
            className="text-neutral-500 hover:text-white underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'VPN Users', icon: Users },
    { id: 'sessions', label: 'Live Sessions', icon: Activity },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(true)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="fixed lg:relative z-50 bg-white border-r border-slate-200 h-screen overflow-hidden shrink-0 flex flex-col"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white">
            <Key size={18} />
          </div>
          <span className="text-lg font-black italic tracking-wide text-slate-900 truncate flex items-center gap-2">
            <Zap className="text-orange-600" size={16} fill="currentColor" /> POWER VPN
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium ${
                  isActive 
                    ? 'bg-slate-100 text-orange-600' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-orange-600' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="bg-slate-50 rounded-lg p-3 mb-4">
            <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-widest">VPN Core Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
              <span className="text-xs font-semibold text-slate-700">ovpn-01: Running</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 overflow-hidden text-xs font-bold border border-white shadow-sm relative">
              {user.photoURL ? (
                <Image 
                    src={user.photoURL} 
                    alt="Avatar" 
                    fill 
                    className="object-cover" 
                    referrerPolicy="no-referrer"
                />
              ) : (
                user.email?.[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{user.displayName || 'Admin'}</p>
              <button 
                onClick={logout}
                className="text-[10px] text-slate-400 hover:text-red-500 font-medium flex items-center gap-1 transition-colors"
              >
                <LogOut size={10} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden font-sans">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-slate-50 rounded-md text-slate-400 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <h2 className="text-sm font-semibold text-slate-600 hidden sm:block capitalize">
              {activeView.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-orange-100">
              Admin Node
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-10 max-w-screen-2xl mx-auto w-full custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && <DashboardView />}
              {activeView === 'users' && <UsersView />}
              {activeView === 'sessions' && <SessionsView />}
              {activeView === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
