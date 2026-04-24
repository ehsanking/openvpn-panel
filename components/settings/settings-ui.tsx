'use client';

import React from 'react';

interface SettingFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingField({ label, description, children }: SettingFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
      {description && <p className="text-[10px] font-medium text-slate-400">{description}</p>}
    </div>
  );
}

interface MaintenanceButtonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export function MaintenanceButton({ title, description, icon, onClick }: MaintenanceButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left group active:scale-[0.98]"
    >
      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-[13px] font-bold text-slate-900 mb-1">{title}</h4>
        <p className="text-[11px] font-medium text-slate-400 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}
