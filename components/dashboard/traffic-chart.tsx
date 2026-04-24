'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const defaultGraphData = [
  { name: '00:00', traffic: 400, connections: 24 },
  { name: '04:00', traffic: 300, connections: 18 },
  { name: '08:00', traffic: 900, connections: 45 },
  { name: '12:00', traffic: 1200, connections: 62 },
  { name: '16:00', traffic: 1500, connections: 78 },
  { name: '20:00', traffic: 1100, connections: 55 },
];

export function TrafficChart() {
  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-bold text-slate-800 tracking-tight">Network Usage</h3>
        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
          <button className="px-3 py-1 bg-white text-xs font-bold text-orange-600 rounded shadow-sm border border-slate-200">24h</button>
          <button className="px-3 py-1 text-xs font-semibold text-slate-400 hover:text-slate-600">7d</button>
          <button className="px-3 py-1 text-xs font-semibold text-slate-400 hover:text-slate-600">30d</button>
        </div>
      </div>
      <div className="h-[320px] w-full pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={defaultGraphData}>
            <defs>
              <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.08}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} 
              dx={-10}
            />
            <Tooltip 
              cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={{ 
                backgroundColor: '#fff', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: 600
              }}
            />
            <Area 
              type="monotone" 
              dataKey="traffic" 
              stroke="#f97316" 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill="url(#colorTraffic)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
