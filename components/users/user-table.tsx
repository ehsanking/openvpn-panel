'use client';

import React from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { formatTraffic } from '@/lib/utils';

export interface VpnUser {
  id: number;
  username: string;
  status: 'active' | 'suspended';
  created_at: string;
  expires_at?: string;
  last_connected?: string;
  traffic_total?: number;
  traffic_limit_gb?: number;
  max_connections?: number;
  cisco_password?: string;
  l2tp_password?: string;
  wg_pubkey?: string;
  xray_uuid?: string;
  port?: number | null;
  main_protocol?: string;
}

interface UserTableProps {
  users: VpnUser[];
  downloading: string | null;
  onDownload: (username: string) => void;
  onToggleStatus: (userId: number, currentStatus: string) => void;
  onDelete: (userId: number) => void;
}

export function UserTable({ users, downloading, onDownload, onToggleStatus, onDelete }: UserTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">User Access List</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{users.length} Total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <th className="px-6 py-3">Login</th>
              <th className="px-6 py-3">Access</th>
              <th className="px-6 py-3">Port / Protocol</th>
              <th className="px-6 py-3">Protocols & Limits</th>
              <th className="px-6 py-3">Expires On</th>
              <th className="px-6 py-3">Quota</th>
              <th className="px-6 py-3">Last Active</th>
              <th className="px-6 py-3">Usage</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {users.length > 0 ? (
              users.map((user) => (
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
                      {user.status === 'active' ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {user.port ? (
                        <span className="text-xs font-mono font-bold text-slate-700">:{user.port}</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Any</span>
                      )}
                      <span className="inline-flex max-w-min items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600">
                        {user.main_protocol || 'OPENVPN'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-orange-100 text-orange-700" title="OpenVPN">
                          OVPN
                        </span>
                        {user.cisco_password && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700" title="Cisco AnyConnect">
                            CSC
                          </span>
                        )}
                        {user.l2tp_password && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-purple-100 text-purple-700" title="L2TP/IPsec">
                            L2TP
                          </span>
                        )}
                        {user.wg_pubkey && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-red-100 text-red-700" title="WireGuard">
                            WG
                          </span>
                        )}
                        {user.xray_uuid && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-pink-100 text-pink-700" title="Xray Core (VLESS/VMess/Trojan)">
                            XR
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold">Max Connections: <strong className="text-slate-700">{user.max_connections || 1}</strong></span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                    {user.expires_at ? new Date(user.expires_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700" title={`${(user.traffic_limit_gb || 10) * 1073741824} bytes`}>
                    {user.traffic_limit_gb || 10} GB
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                    {user.last_connected ? new Date(user.last_connected).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4" title={`${user.traffic_total || 0} bytes`}>
                      <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                              className={`h-full ${((user.traffic_total || 0) / 1073741824) / (user.traffic_limit_gb || 10) > 0.9 ? 'bg-red-500' : 'bg-orange-500'}`} 
                              style={{ width: `${Math.min(100, (((user.traffic_total || 0) / 1073741824) / (user.traffic_limit_gb || 10)) * 100)}%` }} 
                              />
                          </div>
                          <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  {formatTraffic(user.traffic_total)}
                              </span>
                              {((user.traffic_total || 0) / 1073741824) / (user.traffic_limit_gb || 10) > 0.85 && (
                                <span title="Approaching limit">
                                  <AlertTriangle size={12} className="text-red-500" />
                                </span>
                              )}
                          </div>
                      </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onDownload(user.username)}
                        disabled={downloading === user.username}
                        className="px-2 py-1 text-xs font-bold text-orange-600 hover:underline disabled:opacity-50"
                        title="Download .ovpn config"
                      >
                        {downloading === user.username ? 'Saving...' : 'Download'}
                      </button>
                      <button 
                        onClick={() => onToggleStatus(user.id, user.status)}
                        className={`px-2 py-1 text-xs font-bold transition-all ${
                          user.status === 'active' ? 'text-orange-600' : 'text-green-600'
                        } hover:underline`}
                      >
                        {user.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button 
                        onClick={() => onDelete(user.id)}
                        className="px-2 py-1 text-xs font-bold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <span>Showing {users.length} active connections</span>
          <div className="flex gap-2">
              <button className="px-2 py-1 border border-slate-200 rounded-md bg-white disabled:opacity-30 disabled:cursor-not-allowed">Previous</button>
              <button className="px-2 py-1 border border-slate-200 rounded-md bg-white">Next</button>
          </div>
      </div>
    </div>
  );
}
