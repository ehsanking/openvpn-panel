'use client';

import React from 'react';

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

export function SessionsSidebar() {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Server Resources</h3>
      <div className="space-y-6">
        <SidebarStat label="Memory" value="30%" percentage={30} />
        <SidebarStat label="Network Usage" value="45%" percentage={45} />
        <SidebarStat label="Security Level" value="85%" percentage={85} />
      </div>
      
      <div className="pt-6 mt-6 border-t border-slate-100">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-3">Network Driver</p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-800 underline decoration-orange-200">tun0</span>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">MTU 1500</span>
          </div>
      </div>
    </div>
  );
}
