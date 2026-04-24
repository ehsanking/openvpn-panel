'use client';

import React from 'react';
import { Search, Filter } from 'lucide-react';

interface UserToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
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
      <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-100 rounded-lg whitespace-nowrap transition-colors uppercase tracking-widest">
        <Filter size={14} />
        <span>Filter</span>
      </button>
    </div>
  );
}
