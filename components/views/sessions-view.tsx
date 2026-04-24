'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  MapPin, 
  Wifi, 
  Clock, 
  Server,
  Terminal,
  RefreshCw,
  Search,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';

interface Session {
  id: number;
  user_id: number;
  username: string;
  start_time: string;
  ip_address: string;
  status: 'active' | 'disconnected';
}

export default function SessionsView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Synchronized 'now' state to satisfy linter and provide real-time updates
  const now = React.useSyncExternalStore(
    React.useCallback((callback: () => void) => {
      const timer = setInterval(callback, 60000);
      return () => clearInterval(timer);
    }, []),
    () => Date.now(),
    () => 0
  );

  const fetchSessions = async () => {
    const res = await fetch('/api/sessions');
    const data = await res.json();
    if (!data.error) setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      await fetchSessions();
    };
    init();
    const interval = setInterval(fetchSessions, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Live Traffic Monitor</h2>
          <p className="text-sm text-slate-500">Real-time visualization of tunnel throughput and latency.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-100 font-bold text-[10px] uppercase tracking-widest">
          <Activity size={12} className="animate-pulse" />
          Server: Operational
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Active Connections List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-t-2 border-t-blue-600">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Active Tunnel Sessions</h3>
                <RefreshCw size={14} className="text-slate-400 cursor-pointer hover:text-blue-600 transition-colors" />
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">Hydrating session data...</div>
            ) : sessions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <motion.div 
                    layout
                    key={session.id} 
                    className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row gap-6 md:items-center group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                        <Terminal size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">{session.username}</h4>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          <span className="flex items-center gap-1.5">
                            <Globe size={10} />
                            {session.ip_address}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 text-sm">
                      <div className="text-left md:text-center min-w-[80px]">
                        <p className="text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-widest leading-none">Uptime</p>
                        <p className="text-xs font-bold text-slate-700 font-mono">
                          {session.start_time ? 
                            Math.floor((now - new Date(session.start_time).getTime()) / 60000) + 'min' : 
                            '...'
                          }
                        </p>
                      </div>
                      <div className="text-left md:text-center min-w-[80px]">
                        <p className="text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-widest leading-none">Status</p>
                        <p className="text-[10px] font-bold text-blue-500 uppercase">
                          {session.status}
                        </p>
                      </div>
                    </div>

                    <button className="text-[10px] uppercase tracking-widest font-bold text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-50 px-3 py-1.5 rounded border border-transparent hover:border-red-100 transition-all">
                      Disconnect
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 mb-4">
                  <Activity size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-1">Silence on Network</h3>
                <p className="text-xs text-slate-400 max-w-[200px]">No encrypted tunnels are currently established with this node.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Resource Allocation</h3>
            <div className="space-y-6">
              <SidebarStat label="RAM Reserved" value="30%" percentage={30} />
              <SidebarStat label="Net Interface" value="45%" percentage={45} />
              <SidebarStat label="Enc Hardening" value="85%" percentage={85} />
            </div>
            
            <div className="pt-6 mt-6 border-t border-slate-100">
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-3">Tunnel Interface</p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-800 underline decoration-blue-200">tun0</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">MTU 1500</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarStat({ label, value, percentage }: { label: string, value: string, percentage: number }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-400 uppercase tracking-widest">{label}</span>
                <span className="text-slate-900">{value}</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900" style={{ width: `${percentage}%` }} />
            </div>
        </div>
    )
}

function ShieldAlert({ size, className }: { size: number, className?: string }) {
  return <Terminal size={size} className={className} />;
}
