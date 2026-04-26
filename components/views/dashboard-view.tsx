'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

// Generates an initial array of fake data points for the mini charts
const generateChartData = (length: number, max: number) => 
  Array.from({ length }).map((_, i) => ({ value: Math.floor(Math.random() * max) }));

export default function DashboardView() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [cpuData, setCpuData] = useState(generateChartData(15, 100));
  const [ramData, setRamData] = useState(generateChartData(15, 100));

  useEffect(() => {
    // Fake real-time data for charts
    const chartInterval = setInterval(() => {
      setCpuData(prev => [...prev.slice(1), { value: Math.floor(Math.random() * Math.random() * 100) }]);
      setRamData(prev => [...prev.slice(1), { value: Math.floor(Math.random() * 50 + 20) }]);
    }, 2000);
    return () => clearInterval(chartInterval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchJson = async (url: string) => {
          const res = await fetch(url);
          if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              return res.json();
            }
          }
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

  const totalUsers = stats?.totalUsers || 0;
  const activeUsers = stats?.activeUsers || 0;
  const deactiveUsers = totalUsers - activeUsers;
  const onlineSessions = stats?.activeSessions || 0;
  
  const resellerCount = users.filter((u) => u.role === 'reseller').length;
  const nodesCount = servers.length;

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Dashboard</h2>
        <p className="text-sm text-slate-500">Monitor your system status and active VPN nodes.</p>
      </header>

      {/* Top Row: System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-48">
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">CPU</span>
            <span className="text-xl font-bold text-slate-800">{cpuData[cpuData.length - 1].value}%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-48">
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ramData}>
                <defs>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRam)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">RAM</span>
            <span className="text-xl font-bold text-slate-800">{ramData[ramData.length - 1].value}%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center h-48">
          <div className="flex w-full items-center justify-around h-full">
            <div className="flex flex-col items-center">
              <div className="p-3 bg-red-50 text-red-500 rounded-full mb-3">
                <ArrowUp size={28} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold text-slate-800 mb-1">{(Math.random() * 50 + 10).toFixed(1)} <span className="text-base text-slate-400 font-medium">MB/s</span></span>
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Upload</span>
            </div>
            <div className="w-px h-24 bg-slate-100"></div>
            <div className="flex flex-col items-center">
              <div className="p-3 bg-green-50 text-green-500 rounded-full mb-3">
                <ArrowDown size={28} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold text-slate-800 mb-1">{(Math.random() * 150 + 50).toFixed(1)} <span className="text-base text-slate-400 font-medium">MB/s</span></span>
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Download</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: User Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-40">
          <span className="text-5xl font-black text-slate-800 tracking-tight mb-2">{totalUsers}</span>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Users</span>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-40">
          <span className="text-5xl font-black text-blue-600 tracking-tight mb-2">{activeUsers}</span>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active</span>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-40">
          <span className="text-5xl font-black text-slate-400 tracking-tight mb-2">{deactiveUsers}</span>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Deactive</span>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-40">
          <span className="text-5xl font-black text-emerald-500 tracking-tight mb-2">{onlineSessions}</span>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Online</span>
        </div>
      </div>

      {/* Bottom Row: System details Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-40">
          <span className="text-5xl font-black text-slate-800 tracking-tight mb-2">{resellerCount}</span>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Reseller</span>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-40">
          <span className="text-2xl font-bold text-slate-700 tracking-tight mb-1 text-center font-mono">IPv4</span>
          <span className="text-2xl font-bold text-slate-700 tracking-tight mb-3 text-center font-mono text-opacity-50">IPv6</span>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">System IP</span>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-40">
          <span className="text-2xl font-bold text-purple-600 tracking-tight mb-1 text-center font-mono">WG1</span>
          <span className="text-2xl font-bold text-purple-600 tracking-tight mb-3 text-center font-mono text-opacity-50">XRAY</span>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">VPN Active Core</span>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-40">
          <span className="text-5xl font-black text-slate-800 tracking-tight mb-2">{nodesCount || 3}</span>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Nodes</span>
        </div>
      </div>
    </div>
  );
}

