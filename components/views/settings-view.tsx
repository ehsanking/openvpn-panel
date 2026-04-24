'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RotateCcw, 
  Shield, 
  Globe, 
  Lock, 
  Cpu, 
  FileText,
  AlertCircle,
  Database,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

interface ServerConfig {
  publicIp: string;
  port: number;
  protocol: 'udp' | 'tcp';
  cipher: string;
  dnsServer: string;
}

import { SettingField, MaintenanceButton } from '@/components/settings/settings-ui';
import { ServerManagement } from '@/components/settings/server-management';

export default function SettingsView() {
  const [config, setConfig] = useState<ServerConfig>({
    publicIp: '45.12.99.1',
    port: 1194,
    protocol: 'udp',
    cipher: 'AES-256-GCM',
    dnsServer: '1.1.1.1'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const contentType = res.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (!data.error) {
                setConfig({
                    publicIp: data.publicIp || '45.12.99.1',
                    port: parseInt(data.port || '1194'),
                    protocol: data.protocol as 'udp' | 'tcp' || 'udp',
                    cipher: data.cipher || 'AES-256-GCM',
                    dnsServer: data.dnsServer || '1.1.1.1'
                });
            }
        } else {
            const text = await res.text();
            console.error("Non-JSON response from settings API:", text.substring(0, 100));
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving config", error);
    }
    setSaving(false);
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/maintenance/backup');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vpn-panel-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err) {
      alert("Snapshot generation failed");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!confirm("CRITICAL WARNING: This will purge the current MySQL database and restore from the snapshot. Continue?")) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/maintenance/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
          alert("Node restore successful. Rebooting session...");
          window.location.reload();
        } else {
          alert("Restore rejected: " + result.error);
        }
      } catch (err) {
        alert("Invalid snapshot format");
      }
    };
    reader.readAsText(file);
  };

  if (loading) return <div className="p-10 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">Loading settings...</div>;

  return (
    <div className="space-y-10 max-w-4xl pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Settings</h2>
        <p className="text-sm text-slate-500">Adjust network and security parameters.</p>
      </div>

      <ServerManagement />

      <form onSubmit={handleSave} className="space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
            <Globe size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Network</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <SettingField label="Public Server IP" description="The IP address users connect to.">
              <input 
                type="text" 
                value={config.publicIp}
                onChange={(e) => setConfig({...config, publicIp: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </SettingField>
            <SettingField label="Port" description="Standard: 1194">
              <input 
                type="number" 
                value={config.port}
                onChange={(e) => setConfig({...config, port: parseInt(e.target.value) || 0})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </SettingField>
            <SettingField label="Protocol" description="UDP is faster, TCP is more stable.">
              <select 
                value={config.protocol}
                onChange={(e) => setConfig({...config, protocol: e.target.value as 'udp' | 'tcp'})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="udp">UDP (Recommended)</option>
                <option value="tcp">TCP</option>
              </select>
            </SettingField>
            <SettingField label="DNS Server" description="DNS for connected users.">
              <input 
                type="text" 
                value={config.dnsServer}
                onChange={(e) => setConfig({...config, dnsServer: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </SettingField>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
            <Lock size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Security</h3>
          </div>
          <div className="p-6">
            <SettingField label="Encryption Method">
              <select 
                value={config.cipher}
                onChange={(e) => setConfig({...config, cipher: e.target.value})}
                className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all mb-4"
              >
                <option value="AES-256-GCM">AES-256-GCM (Best Security)</option>
                <option value="AES-128-GCM">AES-128-GCM (Faster)</option>
                <option value="CHACHA20-POLY1305">CHACHA20-POLY1305 (Mobile Optimized)</option>
              </select>
            </SettingField>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <AlertCircle className="text-slate-400 shrink-0" size={18} />
              <p className="text-[11px] font-semibold text-slate-500 leading-tight">
                Warning: Changing the encryption will disconnect all users. They must download a new config file to reconnect.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between pt-6">
          <button 
            type="button"
            className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
          >
            Reset to defaults
          </button>
          <button 
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-sm active:scale-95 disabled:bg-slate-300"
          >
            {saving ? 'Saving...' : saved ? 'Changes Saved' : 'Save Changes'}
          </button>
        </div>
      </form>

      <section className="pt-12 border-t border-slate-200">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          Maintenance
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MaintenanceButton 
            title="Restart Server" 
            description="Restarts the network service and online sessions."
            icon={<RotateCcw size={18} className="text-slate-400" />}
            onClick={() => alert("Simulating OpenVPN service restart...")}
          />
          <MaintenanceButton 
            title="Show Config" 
            description="View the underlying server configuration file."
            icon={<FileText size={18} className="text-slate-400" />}
            onClick={() => alert("Displaying raw server.conf template...")}
          />
          <MaintenanceButton 
            title="Backup Data" 
            description="Download a backup of all users and settings."
            icon={<Database size={18} className="text-slate-400" />}
            onClick={handleExport}
          />
          <div className="relative">
            <MaintenanceButton 
              title="Restore Data" 
              description="Upload a previous backup file to restore settings."
              icon={<Shield size={18} className="text-slate-400" />}
              onClick={() => document.getElementById('import-input')?.click()}
            />
            <input 
              id="import-input"
              type="file" 
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
