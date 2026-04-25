'use client';

import React from 'react';
import { Terminal, Globe } from 'lucide-react';
import { motion } from 'motion/react';

interface Session {
  id: number;
  user_id: number;
  username: string;
  start_time: string;
  ip_address: string;
  status: 'active' | 'disconnected';
}

interface SessionItemProps {
  session: Session;
  now: number;
}

export function SessionItem({ session, now }: SessionItemProps) {
  return (
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
          <p className="text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-widest leading-none">Active For</p>
          <p className="text-xs font-bold text-slate-700 font-mono">
            {session.start_time ? 
              Math.floor((now - new Date(session.start_time).getTime()) / 60000) + 'min' : 
              '...'
            }
          </p>
        </div>
        <div className="text-left md:text-center min-w-[80px]">
          <p className="text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-widest leading-none">Status</p>
          <p className="text-[10px] font-bold text-orange-500 uppercase">
            {session.status}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
