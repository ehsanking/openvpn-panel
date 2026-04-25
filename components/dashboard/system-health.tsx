'use client';

import React from 'react';
import { motion } from 'motion/react';

interface StatusItemProps {
  label: string;
  value: string;
  percentage: number;
  color: string;
}

export function StatusItem({ label, value, percentage, color }: StatusItemProps) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-2">
        <span className="font-bold text-slate-900 uppercase tracking-widest" style={{fontSize: '9px'}}>{label}</span>
        <span className="font-bold text-slate-600">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}

export function SystemHealth({ stats }: { stats: any }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 tracking-tight">Server Health</h3>
        <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Simulated Metrics</p>
      </div>
      <div className="p-6 space-y-8 flex-1">
        <StatusItem label="CPU Load" value={(stats?.systemLoad || 0) + "%"} percentage={stats?.systemLoad || 0} color="bg-orange-600" />
        <StatusItem label="Memory" value="2 / 8 GB" percentage={25} color="bg-slate-800" />
        <StatusItem label="Disk space" value="22 GB free" percentage={70} color="bg-slate-600" />
        <StatusItem label="Network Load" value="12%" percentage={12} color="bg-green-600" />
      </div>
      <div className="p-6 pt-0">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Server Status</span>
            <span className="text-xs font-bold text-green-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Online
            </span>
        </div>
      </div>
    </div>
  );
}
