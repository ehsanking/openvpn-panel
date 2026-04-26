'use client';

import React, { useState, useEffect } from 'react';
import { Network, Plus, Server, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Inbound {
  id: number;
  name: string;
  protocol: string;
  port: number;
  remark: string;
  created_at: string;
}

export default function InboundsView() {
  const [inbounds, setInbounds] = useState<Inbound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState('vless');
  const [port, setPort] = useState('');
  const [remark, setRemark] = useState('');

  const fetchInbounds = async () => {
    try {
      const res = await fetch('/api/inbounds');
      const data = await res.json();
      if (data.inbounds) {
        setInbounds(data.inbounds);
      }
    } catch (_error) {
      toast.error('Failed to load inbounds');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInbounds();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !port) return toast.error('Name and port are required');
    
    try {
      const res = await fetch('/api/inbounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, protocol, port, remark })
      });
      
      if (!res.ok) throw new Error('Failed to create outbound');
      
      toast.success('Inbound created successfully');
      setName('');
      setPort('');
      setRemark('');
      setIsAdding(false);
      fetchInbounds();
    } catch (_error) {
      toast.error('Failed to create inbound');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Network className="text-blue-500" />
            Inbound Management
          </h2>
          <p className="text-gray-500 mt-1">Configure and monitor server inbounds and proxies.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center gap-2"
        >
          {isAdding ? <X size={18} /> : <Plus size={18} />}
          {isAdding ? 'Cancel' : 'Add Inbound'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Create New Inbound</h3>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Main VLESS"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="vless">VLESS</option>
                    <option value="vmess">VMess</option>
                    <option value="trojan">Trojan</option>
                    <option value="shadowsocks">Shadowsocks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="443"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Remark</label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Optional description"
                  />
                </div>
                <div className="lg:col-span-4 flex justify-end mt-2">
                  <button
                    type="submit"
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    Create Inbound
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading inbounds...</div>
        ) : inbounds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Server className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>No inbounds configured yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Protocol</th>
                  <th className="px-6 py-4">Port</th>
                  <th className="px-6 py-4">Remark</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {inbounds.map((inbound) => (
                  <tr key={inbound.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{inbound.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 uppercase tracking-wider">
                        {inbound.protocol}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">{inbound.port}</td>
                    <td className="px-6 py-4 text-gray-500">{inbound.remark || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      {/* Action buttons could go here */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
