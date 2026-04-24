'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  showProgress?: boolean;
  progressValue?: number;
}

export function StatCard({ title, value, change, trend, showProgress, progressValue }: StatCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all group">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mb-1">{title}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
        {showProgress && progressValue !== undefined && (
             <div className="flex-1 max-w-[40px] h-1 bg-slate-100 rounded-full overflow-hidden self-center ml-2">
                <div className="h-full bg-orange-500" style={{ width: `${progressValue}%` }} />
             </div>
        )}
      </div>
      <p className={`text-[11px] font-semibold ${
        trend === 'up' ? 'text-green-600' : 'text-slate-400'
      }`}>
        {change}
      </p>
    </div>
  );
}
