'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export function UserConsumptionChart({ data }: { data: any[] }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-bold text-slate-800 tracking-tight">Active User Consumption</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total traffic per tunnel profile (MB)</p>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
             <span className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Real-time Metrics</span>
          </div>
      </div>
      <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
              />
              <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
              />
              <Tooltip 
                 cursor={{ fill: '#f8fafc' }}
                 contentStyle={{ 
                   backgroundColor: '#fff', 
                   borderRadius: '8px', 
                   border: '1px solid #e2e8f0', 
                   fontSize: '11px',
                   fontWeight: 700
                 }}
              />
              <Bar 
                  dataKey="traffic" 
                  fill="#f97316" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                  animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
}
