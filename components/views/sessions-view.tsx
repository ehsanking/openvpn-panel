'use client';

import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { SessionList } from '@/components/sessions/session-list';
import { SessionsSidebar } from '@/components/sessions/sessions-sidebar';

interface Session {
  id: number;
  user_id: number;
  username: string;
  start_time: string;
  ip_address: string;
  status: 'active' | 'disconnected';
}

interface Issue {
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
}

export default function SessionsView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);

  // Synchronized 'now' state to satisfy linter and provide real-time updates
  const now = React.useSyncExternalStore(
    React.useCallback((callback: () => void) => {
      const timer = setInterval(callback, 60000);
      return () => clearInterval(timer);
    }, []),
    () => Date.now(),
    () => 0
  );

  const fetchSessions = async () => {
    try {
      const [sessRes, statsRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/stats')
      ]);

      if (sessRes.ok) {
        const data = await sessRes.json();
        if (!data.error) setSessions(data);
      }

      if (statsRes.ok) {
        const stats = await statsRes.json();
        const foundIssues: Issue[] = [];
        if (stats.systemLoad > 80) {
          foundIssues.push({ title: 'High CPU Load', description: `System load is currently at ${Math.round(stats.systemLoad)}%`, severity: 'warning' });
        }
        if (stats.memoryUsagePercent > 85) {
          foundIssues.push({ title: 'High Memory Usage', description: 'System memory is almost full.', severity: 'critical' });
        }
        if (foundIssues.length === 0) {
          foundIssues.push({ title: 'System Status Optimal', description: 'All node resources and database metrics are within normal ranges.', severity: 'info' })
        }
        setIssues(foundIssues);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchSessions();
    };
    init();
    const interval = setInterval(fetchSessions, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Live Sessions & Health Center</h2>
          <p className="text-sm text-slate-500">Real-time visualization of tunnel throughput and system health.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-100 font-bold text-[10px] uppercase tracking-widest">
          <ShieldCheck size={14} />
          Protected Monitor
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="text-blue-500" /> System Health Checks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {issues.map((issue, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${
              issue.severity === 'critical' ? 'bg-red-50 border-red-100 text-red-900' :
              issue.severity === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-900' :
              'bg-blue-50 border-blue-100 text-blue-900'
            }`}>
               <div className="flex items-center gap-2 mb-2 font-bold">
                 {issue.severity === 'critical' && <AlertTriangle size={18} className="text-red-600" />}
                 {issue.severity === 'warning' && <Cpu size={18} className="text-yellow-600" />}
                 {issue.severity === 'info' && <ShieldCheck size={18} className="text-blue-600" />}
                 {issue.title}
               </div>
               <p className="text-sm opacity-80">{issue.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <SessionList sessions={sessions} loading={loading} now={now} />
        </div>

        <div className="space-y-6">
          <SessionsSidebar />
        </div>
      </div>
    </div>
  );
}
