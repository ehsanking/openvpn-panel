'use client';

import React, { useState } from 'react';
import { Server, Activity, Users, AlertTriangle, History } from 'lucide-react';
import { motion } from 'motion/react';
import { ServerHistoryModal } from '@/components/dashboard/server-history-modal';

interface ServerStat {
  id: number;
  name: string;
  ip_address: string;
  load_score: number;
  status: 'online' | 'offline';
  bandwidth_ingress?: number;
  bandwidth_egress?: number;
  latency_ms?: number;
  active_connections: number;
}

interface ServerStatusListProps {
  servers: ServerStat[];
  loading: boolean;
}

export function ServerStatusList({ servers, loading }: ServerStatusListProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4 uppercase tracking-widest">Server Status</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const criticalServers = servers.filter(s => s.status === 'offline' || s.load_score > 90);

  return (
    <div className="space-y-4">
      {criticalServers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-lg text-red-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-red-800 mb-1">Critical Server Alert</h4>
            <p className="text-xs text-red-600">
              {criticalServers.map(s => s.name).join(', ')} is currently experiencing critical load or is offline. Email notification has been dispatched to administrators.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Server size={16} className="text-blue-600" />
            VPN Servers
          </h3>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest"
            >
              <History size={14} />
              History
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{servers.length} Active Node(s)</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {servers.length > 0 ? (
            servers.map((server) => (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={server.id} 
                className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${server.status === 'online' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    <Server size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{server.name}</h4>
                    <p className="text-[10px] font-mono font-bold text-slate-400">{server.ip_address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  
                  {server.bandwidth_ingress !== undefined && (
                    <div className="min-w-[80px]">
                      <p className="text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-widest">Network I/O</p>
                      <div className="text-xs font-bold text-slate-700">
                        <span className="text-blue-500">↓ {server.bandwidth_ingress}</span>
                        <span className="mx-1 text-slate-300">|</span>
                        <span className="text-emerald-500">↑ {server.bandwidth_egress}</span>
                        <span className="text-[10px] text-slate-400 ml-1">Mbps</span>
                      </div>
                    </div>
                  )}

                  {server.latency_ms !== undefined && (
                    <div className="min-w-[60px]">
                      <p className="text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-widest">Latency</p>
                      <div className="text-xs font-bold text-slate-700 font-mono">
                        {server.latency_ms} ms
                      </div>
                    </div>
                  )}

                  <div className="min-w-[80px]">
                    <p className="text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-widest">Current Load</p>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${server.load_score > 80 ? 'bg-red-500' : server.load_score > 50 ? 'bg-orange-500' : 'bg-green-500'}`} 
                          style={{ width: `${server.load_score}%` }} 
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700">{server.load_score}%</span>
                    </div>
                  </div>

                  <div className="min-w-[50px]">
                    <p className="text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-widest">Sessions</p>
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">{server.active_connections}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100 min-w-[70px] justify-center">
                    <div className={`w-1.5 h-1.5 rounded-full ${server.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${server.status === 'online' ? 'text-slate-600' : 'text-red-600'}`}>{server.status}</span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-10 text-center">
               <div className="flex justify-center mb-4 text-slate-200">
                  <Activity size={32} />
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No servers deployed</p>
            </div>
          )}
        </div>
      </div>
      
      <ServerHistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
