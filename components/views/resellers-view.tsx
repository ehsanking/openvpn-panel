'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield, Activity, MoreHorizontal, UserPlus, X, Save, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface Reseller {
  id: number;
  username: string;
  status: 'active' | 'suspended' | 'disabled';
  created_at: string;
  traffic_total?: number;
  max_users?: number;
  allocated_traffic_gb?: number;
}

export function ResellersView() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    max_users: 50,
    allocated_traffic_gb: 500,
  });

  const fetchResellers = () => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        const reps = (data.data || []).filter((u: any) => u.role === 'reseller');
        setResellers(reps);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResellers();
  }, []);

  const handleAddReseller = async () => {
    if (!formData.username || !formData.password) {
      toast.error('Username and password are required');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: 'reseller',
          status: 'active',
          traffic_limit_gb: formData.allocated_traffic_gb,
          max_connections: formData.max_users,
        }),
      });

      if (res.ok) {
        toast.success('Reseller created successfully');
        setShowAddModal(false);
        setFormData({ username: '', password: '', max_users: 50, allocated_traffic_gb: 500 });
        fetchResellers();
      } else {
        const err = await res.json();
        toast.error(err.error?.message || 'Failed to create reseller');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteReseller = async (id: number) => {
    if (!confirm('Are you sure you want to delete this reseller?')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Reseller deleted');
        fetchResellers();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="text-purple-500" />
            Resellers (Namayande)
          </h2>
          <p className="text-sm text-slate-500">Manage resellers with user creation limits and traffic quotas.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Total Resellers</p>
            <p className="text-xl font-black text-purple-700">{resellers.length}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors"
          >
            <UserPlus size={16} />
            Add Reseller
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4 text-slate-400">
            <Activity className="animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading resellers...</p>
          </div>
        ) : resellers.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
              <Users size={32} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No resellers registered yet</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors"
            >
              <UserPlus size={16} />
              Add Your First Reseller
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Max Users</th>
                  <th className="px-6 py-4">Traffic Quota</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                <AnimatePresence mode="popLayout">
                  {resellers.map((reseller) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={reseller.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                            <Shield size={16} />
                          </div>
                          <span className="font-bold text-slate-900 tracking-tight">{reseller.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                          reseller.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {reseller.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{reseller.max_users || 50} users</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{reseller.allocated_traffic_gb || 500} GB</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-bold uppercase tracking-wider">
                        {new Date(reseller.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteReseller(reseller.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Reseller Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Add New Reseller</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="reseller_username"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="Strong password"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Users</label>
                    <input
                      type="number"
                      value={formData.max_users}
                      onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 50 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Traffic Quota (GB)</label>
                    <input
                      type="number"
                      value={formData.allocated_traffic_gb}
                      onChange={(e) => setFormData({ ...formData, allocated_traffic_gb: parseInt(e.target.value) || 500 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddReseller}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Create Reseller
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
