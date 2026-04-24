'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Download, MapPin, Activity, QrCode, Zap, CopyIcon, Wifi, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ClientPortal() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
      if (data.error && !data.user) {
        setError(data.error);
      } else if (data.user) {
        // Even if suspended, we will show their portal
        setUser(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDownload = () => {
    window.location.href = '/api/client/download';
  };

  const generateXrayConfig = (uuid: string) => {
    // Generate a basic VLESS standard payload string
    const host = window.location.hostname;
    return `vless://${uuid}@${host}:443?type=tcp&security=tls&flow=xtls-rprx-vision&sni=${host}#${username}-PowerVPN`;
  };

  const [isExpired, setIsExpired] = useState(false);
  
  useEffect(() => {
    if (user?.expires) {
      setTimeout(() => setIsExpired(new Date(user.expires).getTime() < Date.now()), 0);
    }
  }, [user?.expires]);

  const copyXray = () => {
    if (user?.xray_uuid) {
      navigator.clipboard.writeText(generateXrayConfig(user.xray_uuid));
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (user) {
    const isSuspended = user.status !== 'active';
    const hasRemainingTraffic = user.traffic < user.limit * 1024 * 1024 * 1024;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className={`${isSuspended || isExpired ? 'bg-red-600' : 'bg-orange-600'} p-8 text-center text-white relative overflow-hidden transition-colors`}>
            <Zap size={48} className="mx-auto mb-4 opacity-90 text-yellow-300 drop-shadow-md" />
            <h2 className="text-2xl font-bold tracking-tight">Power VPN Portal</h2>
            <p className="text-white/80 mt-2 text-sm font-medium">Hello, {user.username}</p>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Status Panel */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${isSuspended ? 'bg-red-50 border-red-100 text-red-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                <div>
                   <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Account Status</p>
                   <p className="font-bold flex items-center gap-2">
                       {isSuspended ? <AlertTriangle size={18} /> : <Wifi size={18} />}
                       {isSuspended ? 'Suspended / Disabled' : 'Active & Ready'}
                   </p>
                </div>
                {user.expires && (
                    <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Expires On</p>
                        <p className="font-bold text-sm">{new Date(user.expires).toLocaleDateString()}</p>
                    </div>
                )}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Data Usage</p>
                <p className="text-lg font-bold text-slate-800">
                  {((user.traffic || 0) / (1024*1024*1024)).toFixed(2)} <span className="text-sm text-slate-500">/ {user.limit} GB</span>
                </p>
              </div>
              <Activity className="text-slate-300" size={24} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleDownload}
                className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold flex flex-col items-center justify-center gap-1 hover:bg-slate-800 transition-colors shadow"
              >
                <Download size={18} />
                <span className="text-xs">OpenVPN</span>
              </button>
              
              <button 
                onClick={copyXray}
                className="w-full bg-pink-600 text-white rounded-xl py-3 font-bold flex flex-col items-center justify-center gap-1 hover:bg-pink-700 transition-colors shadow"
              >
                <CopyIcon size={18} />
                <span className="text-xs">{copiedLink ? 'Copied!' : 'Copy Xray (VLESS)'}</span>
              </button>
            </div>

            <div className="flex flex-col items-center bg-white border border-slate-100 p-6 rounded-xl shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <QrCode size={14}/> Scan config (OpenVPN / Xray)
                </p>
                <QRCodeSVG 
                    value={user.xray_uuid ? generateXrayConfig(user.xray_uuid) : `vpn://connect?user=${user.username}`} 
                    size={160} 
                    level="Q"
                    includeMargin={true}
                    className="border border-slate-100 rounded-xl"
                />
            </div>

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
