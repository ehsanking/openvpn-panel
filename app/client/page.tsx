'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Download, MapPin, Activity } from 'lucide-react';

export default function ClientPortal() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setUser(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDownload = () => {
    // Generate profile using existing logic, but this would need an API endpoint 
    // that uses the client_token. Let's redirect to a download API endpoint.
    window.location.href = '/api/client/download';
  };

  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className="bg-orange-600 p-8 text-center text-white">
            <Shield size={48} className="mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl font-bold">Welcome, {user.username}</h2>
            <p className="text-orange-100 mt-2 text-sm">Your secure connection portal</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Data Usage</p>
                <p className="text-lg font-bold text-slate-800">
                  {(user.traffic / (1024*1024*1024)).toFixed(2)} <span className="text-sm text-slate-500">/ {user.limit} GB</span>
                </p>
              </div>
              <Activity className="text-slate-300" size={24} />
            </div>

            <button 
              onClick={handleDownload}
              className="w-full bg-slate-900 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <Download size={20} />
              Download OpenVPN Profile
            </button>

            <button 
              onClick={() => setUser(null)}
              className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.form 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={handleLogin}
        className="bg-white max-w-sm w-full rounded-2xl shadow-xl border border-slate-200 p-8"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <MapPin size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Client Portal</h2>
          <p className="text-sm text-slate-500 mt-1">Sign in to download your config.</p>
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
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-sm"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white rounded-xl py-3 mt-8 font-bold hover:bg-orange-700 transition-all active:scale-95 disabled:bg-slate-300"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </motion.form>
    </div>
  );
}
