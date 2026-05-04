'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Network, Users, Plug, Activity, AlertCircle, Loader2,
  Lock, Wifi, Globe, Key, Radio, Shield,
} from 'lucide-react';
interface RecentUser {
  id: number;
  username: string;
  role: string;
  status: string;
  created_at: string;
}

interface RecentInbound {
  id: number;
  name: string;
  protocol: string;
  port: number;
  server_address: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  inbounds: {
    total: number;
    byProtocol: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    disabled: number;
    expired: number;
  };
  assignments: number;
  recent: {
    users: RecentUser[];
    inbounds: RecentInbound[];
  };
}

const PROTOCOL_LABEL: Record<string, string> = {
  openvpn: 'OpenVPN',
  wireguard: 'WireGuard',
  cisco: 'Cisco AnyConnect',
  l2tp: 'L2TP/IPsec',
  ikev2: 'IKEv2/IPsec',
  pptp: 'PPTP (legacy)',
  sstp: 'SSTP',
  vless: 'VLESS',
  vmess: 'VMess',
  trojan: 'Trojan',
  shadowsocks: 'Shadowsocks',
  hysteria2: 'Hysteria 2',
  tuic: 'TUIC v5',
};

const PROTOCOL_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  openvpn: Lock,
  wireguard: Wifi,
  cisco: Globe,
  l2tp: Key,
  ikev2: Shield,
  pptp: Lock,
  sstp: Lock,
  vless: Radio,
  vmess: Radio,
  trojan: Shield,
  shadowsocks: Radio,
  hysteria2: Wifi,
  tuic: Wifi,
};

const PROTOCOL_BG: Record<string, string> = {
  openvpn: 'bg-orange-50 text-orange-600',
  wireguard: 'bg-purple-50 text-purple-600',
  cisco: 'bg-blue-50 text-blue-600',
  l2tp: 'bg-green-50 text-green-600',
  ikev2: 'bg-teal-50 text-teal-600',
  pptp: 'bg-amber-50 text-amber-600',
  sstp: 'bg-sky-50 text-sky-600',
  vless: 'bg-cyan-50 text-cyan-600',
  vmess: 'bg-pink-50 text-pink-600',
  trojan: 'bg-red-50 text-red-600',
  shadowsocks: 'bg-indigo-50 text-indigo-600',
  hysteria2: 'bg-violet-50 text-violet-600',
  tuic: 'bg-fuchsia-50 text-fuchsia-600',
};

interface Props {
  onNavigate?: (view: 'inbounds' | 'users' | 'settings') => void;
}

export function DashboardView({ onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stats', { credentials: 'include' });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || `Request failed with ${res.status}`);
      setStats(body as DashboardStats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span className="text-xs font-bold uppercase tracking-widest">Loading dashboard…</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-red-500 bg-red-50 rounded-2xl border border-red-100">
        <AlertCircle className="mb-3" size={28} />
        <p className="font-medium">{error ?? 'No stats available'}</p>
        <button
          onClick={load}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalInbounds = stats.inbounds.total;
  const totalUsers = stats.users.total;
  const activeUsers = stats.users.active;
  const expiredUsers = stats.users.expired;
  const protocols = Object.entries(stats.inbounds.byProtocol).sort((a, b) => b[1] - a[1]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">
          Live snapshot of the panel — inbounds, users, and protocol coverage.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Network size={18} className="text-blue-500" />}
          label="Inbounds"
          value={totalInbounds}
          hint={`${protocols.length} protocols configured`}
          onClick={onNavigate ? () => onNavigate('inbounds') : undefined}
        />
        <StatCard
          icon={<Users size={18} className="text-emerald-500" />}
          label="Total users"
          value={totalUsers}
          hint={`${activeUsers} active${expiredUsers ? ` · ${expiredUsers} expired` : ''}`}
          onClick={onNavigate ? () => onNavigate('users') : undefined}
        />
        <StatCard
          icon={<Plug size={18} className="text-purple-500" />}
          label="Assignments"
          value={stats.assignments}
          hint="user ↔ inbound links"
        />
        <StatCard
          icon={<Activity size={18} className="text-orange-500" />}
          label="Disabled / suspended"
          value={stats.users.disabled}
          hint="users blocked from connecting"
        />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
          <Network size={16} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Inbounds by protocol</h3>
        </div>
        <div className="p-6">
          {protocols.length === 0 ? (
            <EmptyHint
              text="No inbounds yet. Create one to start serving configs."
              cta="Open Inbounds"
              onClick={onNavigate ? () => onNavigate('inbounds') : undefined}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {protocols.map(([proto, count]) => {
                const Icon = PROTOCOL_ICON[proto] || Radio;
                return (
                  <div
                    key={proto}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${PROTOCOL_BG[proto] || 'bg-slate-100 text-slate-600'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {PROTOCOL_LABEL[proto] || proto}
                      </p>
                      <p className="text-lg font-black text-slate-900 leading-tight">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentList
          title="Recent inbounds"
          empty="No inbounds yet."
          rows={stats.recent.inbounds.map((i) => ({
            id: i.id,
            primary: i.name,
            secondary: `${i.protocol.toUpperCase()} · ${i.server_address}:${i.port}`,
            badge: i.status,
            ts: i.created_at,
          }))}
        />
        <RecentList
          title="Recent users"
          empty="No users yet."
          rows={stats.recent.users.map((u) => ({
            id: u.id,
            primary: u.username,
            secondary: u.role.toUpperCase(),
            badge: u.status,
            ts: u.created_at,
          }))}
        />
      </div>
    </motion.div>
  );
}

function StatCard({
  icon, label, value, hint, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={`text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all ${
        interactive ? 'hover:border-blue-300 hover:shadow active:scale-[0.99] cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
        {icon} {label}
      </div>
      <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
    </button>
  );
}

function EmptyHint({ text, cta, onClick }: { text: string; cta?: string; onClick?: () => void }) {
  return (
    <div className="text-center py-8 text-slate-400">
      <p className="text-sm">{text}</p>
      {cta && onClick && (
        <button
          onClick={onClick}
          className="mt-3 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function RecentList({
  title, rows, empty,
}: {
  title: string;
  rows: Array<{ id: number; primary: string; secondary: string; badge?: string; ts?: string }>;
  empty: string;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="px-6 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{row.primary}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 truncate">
                  {row.secondary}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                {row.badge && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                      row.badge === 'active'
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {row.badge}
                  </span>
                )}
                {row.ts && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(row.ts).toLocaleDateString()}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
