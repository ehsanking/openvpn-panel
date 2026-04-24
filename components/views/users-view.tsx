'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateOvpnProfile, downloadFile } from '@/lib/ovpn-generator';

interface VpnUser {
  id: number;
  username: string;
  status: 'active' | 'suspended';
  created_at: string;
  last_connected?: string;
}

export default function UsersView() {
  const [users, setUsers] = useState<VpnUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (!data.error) setUsers(data);
  };

  useEffect(() => {
    const init = async () => {
      await fetchUsers();
    };
    init();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus })
    });
    fetchUsers();
  };

  const deleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  const handleDownload = async (username: string) => {
    setDownloading(username);
    try {
      const content = await generateOvpnProfile(username);
      downloadFile(`${username}.ovpn`, content);
    } catch (error) {
      console.error("Error generating profile", error);
    }
    setDownloading(null);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername) return;

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername })
      });
      setNewUsername('');
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error adding user", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">User Management</h2>
          <p className="text-sm text-slate-500">Manage and monitor all OpenVPN client profiles.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Create New User</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search network users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 border-none rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-300"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-100 rounded-lg whitespace-nowrap transition-colors uppercase tracking-widest">
          <Filter size={14} />
          <span>Filter</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Active VPN Identities</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredUsers.length} Connections</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
                <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <th className="px-6 py-3">User Identifier</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Data usage</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 tracking-tight">{user.username}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {user.status === 'active' ? 'Active' : 'Idle'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                      {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${Math.min((user.trafficTotal || 0) / 1000000, 100)}%` }} 
                                />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                                {((user.trafficTotal || 0) / 1024 / 1024).toFixed(1)}M
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDownload(user.username)}
                          disabled={downloading === user.username}
                          className="px-2 py-1 text-xs font-bold text-blue-600 hover:underline disabled:opacity-50"
                          title="Download .ovpn"
                        >
                          {downloading === user.username ? 'Fetching...' : 'Profile'}
                        </button>
                        <button 
                          onClick={() => toggleUserStatus(user.id, user.status)}
                          className={`px-2 py-1 text-xs font-bold transition-all ${
                            user.status === 'active' ? 'text-orange-600' : 'text-green-600'
                          } hover:underline`}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Resume'}
                        </button>
                        <button 
                          onClick={() => deleteUser(user.id)}
                          className="px-2 py-1 text-xs font-bold text-red-600 hover:underline"
                        >
                          Kill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">
                    No matching identities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <span>Showing {filteredUsers.length} active connections</span>
            <div className="flex gap-2">
                <button className="px-2 py-1 border border-slate-200 rounded-md bg-white disabled:opacity-30 disabled:cursor-not-allowed">Previous</button>
                <button className="px-2 py-1 border border-slate-200 rounded-md bg-white">Next</button>
            </div>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.form 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onSubmit={handleAddUser}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-200"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Create VPN Account</h3>
              <p className="text-slate-500 text-sm mb-6">Enter a unique username for the new connection profile.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    placeholder="e.g. john_doe_work"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                >
                  Create User
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
