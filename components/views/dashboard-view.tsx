'use client';

import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { SystemHealth } from '@/components/dashboard/system-health';
import { TrafficChart } from '@/components/dashboard/traffic-chart';
import { UserConsumptionChart } from '@/components/dashboard/user-consumption-chart';
import { ServerStatusList } from '@/components/dashboard/server-status-list';

export default function DashboardView() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchJson = async (url: string) => {
          const res = await fetch(url);
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return res.json();
          }
          const text = await res.text();
          console.error(`Non-JSON response from ${url}:`, text.substring(0, 100));
          return { error: 'Invalid response format' };
        };

        const [statsRes, usersRes, serversRes] = await Promise.all([
          fetchJson('/api/stats'),
          fetchJson('/api/users'),
          fetchJson('/api/servers/stats')
        ]);
        
        if (statsRes && !statsRes.error) setStats(statsRes);
        if (Array.isArray(usersRes)) setUsers(usersRes);
        if (Array.isArray(serversRes)) setServers(serversRes);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-xs font-bold text-slate-400 animate-pulse uppercase tracking-[0.2em]">Loading Dashboard...</div>;

  const topUsersData = users
    .filter(u => u.traffic_total > 0)
    .sort((a, b) => b.traffic_total - a.traffic_total)
    .slice(0, 6)
    .map(u => ({
      name: u.username,
      traffic: Math.round(u.traffic_total / (1024 * 1024)) // MB
    }));

  const trafficFormatted = stats?.totalTraffic 
    ? (stats.totalTraffic > 1024 * 1024 * 1024 
        ? (stats.totalTraffic / 1024 / 1024 / 1024).toFixed(2) + ' GB' 
        : (stats.totalTraffic / 1024 / 1024).toFixed(2) + ' MB') 
    : '0 MB';

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Dashboard</h2>
          <p className="text-sm text-slate-500">Monitor your users and network health.</p>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                <Globe size={16} />
                <span>Node Status</span>
            </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats?.activeUsers?.toString() || "0"} 
          change={`${stats?.activeSessions || 0} Online`} 
          trend="up"
        />
        <StatCard 
          title="Total Data" 
          value={trafficFormatted} 
          change="Network usage" 
          trend="up"
        />
        <StatCard 
          title="CPU Load" 
          value={(stats?.systemLoad || 0) + "%"} 
          change="System Stable" 
          trend="up"
          showProgress
          progressValue={stats?.systemLoad || 0}
        />
        <StatCard 
          title="Active Nodes" 
          value={stats?.onlineServers?.toString() || "0"} 
          change="Global reach" 
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <TrafficChart />
        <SystemHealth stats={stats} />
      </div>

      <ServerStatusList servers={servers} loading={loading} />

      <UserConsumptionChart data={topUsersData} />
    </div>
  );
}
