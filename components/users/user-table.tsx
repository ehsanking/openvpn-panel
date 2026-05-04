'use client';

import React, { useState } from 'react';
import { Search, Filter, Download, Power, Trash2, User as UserIcon } from 'lucide-react';
import { formatTraffic } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export interface VpnUser {
  id: number;
  username: string;
  status: 'active' | 'suspended' | 'disabled';
  role: 'admin' | 'reseller' | 'user';
  created_at: string;
  expires_at?: string;
  last_connected?: string;
  traffic_total?: number;
  traffic_limit_gb?: number;
  max_connections?: number;
}

interface UserTableProps {
  users: VpnUser[];
  onDownload: (username: string) => void;
  onToggleStatus: (userId: number, currentStatus: string) => void;
  onDelete: (userId: number) => void;
}

export function UserTable({ users, onDownload, onToggleStatus, onDelete }: UserTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-sm bg-transparent border-none focus:ring-0 cursor-pointer font-medium text-slate-600"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="reseller">Resellers</option>
              <option value="user">Users</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm bg-transparent border-none focus:ring-0 cursor-pointer font-medium text-slate-600"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <th className="px-6 py-4">Username</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Created Date</th>
              <th className="px-6 py-4">Traffic Usage</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            <AnimatePresence mode="popLayout">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={user.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                          <UserIcon size={16} />
                        </div>
                        <span className="font-bold text-slate-900 tracking-tight">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'reseller' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 w-36">
                        <div className="flex items-center justify-between text-[10px] font-bold tracking-tight">
                          <span className="text-slate-600">{formatTraffic(user.traffic_total)}</span>
                          <span className="text-slate-400">{user.traffic_limit_gb ? `${user.traffic_limit_gb} GB` : 'UNLIMITED'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative group/progress">
                          {user.traffic_limit_gb ? (
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (((user.traffic_total || 0) / 1073741824) / user.traffic_limit_gb) * 100)}%` }}
                              className={`h-full relative z-10 ${
                                ((user.traffic_total || 0) / 1073741824) / user.traffic_limit_gb > 0.9 
                                  ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                                  : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                              }`} 
                            />
                          ) : (
                            <div className="h-full w-full bg-slate-200/50 flex transition-all">
                              <motion.div 
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                className="h-full w-1/2 bg-gradient-to-r from-transparent via-slate-300 to-transparent"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onDownload(user.username)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Open Subscription Portal"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={() => onToggleStatus(user.id, user.status)}
                          className={`p-2 rounded-lg transition-all ${
                            user.status === 'active' ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={user.status === 'active' ? 'Disable' : 'Enable'}
                        >
                          <Power size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(user.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">
                    No users found matching your criteria
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <span>Showing {filteredUsers.length} of {users.length} users</span>
      </div>
    </div>
  );
}
