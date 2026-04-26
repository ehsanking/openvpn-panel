'use client';

import React, { useState, useEffect } from 'react';
import { Server, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export function ServerManagement() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newServer, setNewServer] = useState({ name: '', ip_address: '', protocol: 'udp', port: 1194 });

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.error) setServers(data);
    } catch (e: any) {
      console.error(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
     
    fetchServers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServer.name || !newServer.ip_address) return;

    try {
      await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServer.name,
          ip_address: newServer.ip_address,
          protocol: newServer.protocol,
          ports: [newServer.port]
        })
      });
      setNewServer({ name: '', ip_address: '', protocol: 'udp', port: 1194 });
      fetchServers();
    } catch (e: any) {
      alert("Failed to add server: " + e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this server?')) return;
    try {
      await fetch(`/api/servers?id=${id}`, { method: 'DELETE' });
      fetchServers();
    } catch (e: any) {
      alert("Failed to delete server: " + e.message);
    }
  };

  if (loading) return null;

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-10">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-3">
            <Server size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Fleet Management</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4 mb-8">
            {servers.map((server) => (
                <div key={server.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">{server.name}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-1">{server.ip_address} • {server.protocol.toUpperCase()} • Ports: {JSON.parse(server.ports || '[]').join(', ')}</p>
                    </div>
                    <button 
                        onClick={() => handleDelete(server.id)}
                        className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
        </div>

        <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Provision New Node</h4>
            <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Display Name</label>
                    <input 
                        type="text" 
                        required
                        value={newServer.name}
                        onChange={e => setNewServer({...newServer, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                        placeholder="Node-02-EU"
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">IP Address</label>
                    <input 
                        type="text" 
                        required
                        value={newServer.ip_address}
                        onChange={e => setNewServer({...newServer, ip_address: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                        placeholder="192.168.1.100"
                    />
                </div>
                <div className="w-full md:w-32">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Protocol</label>
                    <select 
                        value={newServer.protocol}
                        onChange={e => setNewServer({...newServer, protocol: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    >
                        <option value="udp">UDP</option>
                        <option value="tcp">TCP</option>
                    </select>
                </div>
                <div className="w-full md:w-32">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Port</label>
                    <input 
                        type="number" 
                        required
                        value={newServer.port}
                        onChange={e => setNewServer({...newServer, port: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                        placeholder="1194"
                    />
                </div>
                <button 
                  type="submit"
                  className="bg-slate-900 text-white p-2.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                >
                    <Plus size={18} />
                </button>
            </form>
        </div>
      </div>
    </section>
  );
}
