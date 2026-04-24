'use client';

import React from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { SessionItem } from './session-item';

interface Session {
  id: number;
  user_id: number;
  username: string;
  start_time: string;
  ip_address: string;
  status: 'active' | 'disconnected';
}

interface SessionListProps {
  sessions: Session[];
  loading: boolean;
  now: number;
}

export function SessionList({ sessions, loading, now }: SessionListProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-t-2 border-t-orange-600">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Online Users</h3>
          <RefreshCw size={14} className="text-slate-400 cursor-pointer hover:text-orange-600 transition-colors" />
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">Loading connections...</div>
      ) : sessions.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <SessionItem key={session.id} session={session} now={now} />
          ))}
        </div>
      ) : (
        <div className="p-16 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 mb-4">
            <Activity size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-1">No Users Online</h3>
          <p className="text-xs text-slate-400 max-w-[200px]">Nobody is currently connected to the network.</p>
        </div>
      )}
    </div>
  );
}
