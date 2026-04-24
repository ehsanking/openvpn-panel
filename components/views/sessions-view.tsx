'use client';

import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
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

export default function SessionsView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

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
      const res = await fetch('/api/sessions');
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!data.error) setSessions(data);
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Live Traffic Monitor</h2>
          <p className="text-sm text-slate-500">Real-time visualization of tunnel throughput and latency.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg border border-orange-100 font-bold text-[10px] uppercase tracking-widest">
          <Activity size={12} className="animate-pulse" />
          Server: Operational
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
