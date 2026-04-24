'use client';

import React from 'react';
import { Search, Filter, Download, FileText } from 'lucide-react';

interface UserToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

async function downloadReport(format: 'csv' | 'pdf', type: 'users' | 'traffic') {
  const url = type === 'traffic'
    ? '/api/reports/traffic'
    : `/api/reports/users?format=${format}`;

  const res = await fetch(url);
  if (!res.ok) { alert('Export failed'); return; }

  const blob = await res.blob();
  const ext = format === 'pdf' ? 'pdf' : 'csv';
  const filename = `${type}-report-${new Date().toISOString().split('T')[0]}.${ext}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function UserToolbar({ searchTerm, onSearchChange }: UserToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          type="text"
          placeholder="Find users..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-50/50 border-none rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-300"
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => downloadReport('csv', 'users')}
          title="Export users as CSV"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-green-700 hover:bg-green-50 border border-slate-100 rounded-lg whitespace-nowrap transition-colors uppercase tracking-widest"
        >
          <Download size={13} />
          CSV
        </button>
        <button
          onClick={() => downloadReport('pdf', 'users')}
          title="Export users as PDF"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-100 rounded-lg whitespace-nowrap transition-colors uppercase tracking-widest"
        >
          <FileText size={13} />
          PDF
        </button>
        <button
          onClick={() => downloadReport('csv', 'traffic')}
          title="Export traffic report as CSV"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-100 rounded-lg whitespace-nowrap transition-colors uppercase tracking-widest"
        >
          <Download size={13} />
          Traffic
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-100 rounded-lg whitespace-nowrap transition-colors uppercase tracking-widest">
          <Filter size={14} />
        </button>
      </div>
    </div>
  );
}
