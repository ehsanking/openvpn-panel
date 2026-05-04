'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Lock, AlertCircle } from 'lucide-react';
import { SettingField } from '@/components/settings/settings-ui';

interface PanelConfig {
  panelName: string;
  publicIp: string;
  port: number;
  protocol: 'udp' | 'tcp';
  cipher: string;
  dnsServer: string;
}

const DEFAULT_CONFIG: PanelConfig = {
  panelName: 'Power VPN',
  publicIp: '',
  port: 1194,
  protocol: 'udp',
  cipher: 'AES-256-GCM',
  dnsServer: '1.1.1.1'
};

export default function SettingsView() {
  const [config, setConfig] = useState<PanelConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        setConfig({
          panelName: data.panelName || DEFAULT_CONFIG.panelName,
          publicIp: data.publicIp || '',
          port: parseInt(data.port || String(DEFAULT_CONFIG.port), 10),
          protocol: (data.protocol as 'udp' | 'tcp') || DEFAULT_CONFIG.protocol,
          cipher: data.cipher || DEFAULT_CONFIG.cipher,
          dnsServer: data.dnsServer || DEFAULT_CONFIG.dnsServer
        });
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to save settings');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 max-w-3xl pb-20">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Settings</h2>
        <p className="text-sm text-slate-500">Default network and security parameters used as fallback when an inbound omits them.</p>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
            <Globe size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Network Defaults</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <SettingField label="Panel Name" description="Displayed on the client portal.">
              <input
                type="text"
                value={config.panelName}
                onChange={(e) => setConfig({ ...config, panelName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </SettingField>
            <SettingField label="Public Server IP" description="Used as the fallback if an inbound has no server_address.">
              <input
                type="text"
                value={config.publicIp}
                onChange={(e) => setConfig({ ...config, publicIp: e.target.value })}
                placeholder="e.g. 45.12.99.1"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </SettingField>
            <SettingField label="Default Port" description="Standard OpenVPN: 1194">
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </SettingField>
            <SettingField label="Default Protocol" description="UDP is faster, TCP is more stable.">
              <select
                value={config.protocol}
                onChange={(e) => setConfig({ ...config, protocol: e.target.value as 'udp' | 'tcp' })}
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
                onChange={(e) => setConfig({ ...config, dnsServer: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </SettingField>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
            <Lock size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Security Defaults</h3>
          </div>
          <div className="p-6">
            <SettingField label="Default Encryption Cipher">
              <select
                value={config.cipher}
                onChange={(e) => setConfig({ ...config, cipher: e.target.value })}
                className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="AES-256-GCM">AES-256-GCM (Best Security)</option>
                <option value="AES-128-GCM">AES-128-GCM (Faster)</option>
                <option value="CHACHA20-POLY1305">CHACHA20-POLY1305 (Mobile Optimized)</option>
              </select>
            </SettingField>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-sm active:scale-95 disabled:bg-slate-300"
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
