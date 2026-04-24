'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newUsername: string;
  setNewUsername: (val: string) => void;
  isBulk?: boolean;
  setIsBulk?: (val: boolean) => void;
  password?: string;
  setPassword?: (val: string) => void;
  ciscoPassword?: string;
  setCiscoPassword?: (val: string) => void;
  l2tpPassword?: string;
  setL2tpPassword?: (val: string) => void;
  maxConnections?: string;
  setMaxConnections?: (val: string) => void;
  protocol?: string;
  setProtocol?: (val: string) => void;
  port?: string;
  setPort?: (val: string) => void;
  expirationDays: string;
  setExpirationDays: (val: string) => void;
  trafficLimit: string;
  setTrafficLimit: (val: string) => void;
}

export function AddUserModal({
  isOpen,
  onClose,
  onSubmit,
  newUsername,
  setNewUsername,
  isBulk = false,
  setIsBulk,
  password = '',
  setPassword,
  ciscoPassword = '',
  setCiscoPassword,
  l2tpPassword = '',
  setL2tpPassword,
  maxConnections = '1',
  setMaxConnections,
  protocol = 'openvpn',
  setProtocol,
  port = '',
  setPort,
  expirationDays,
  setExpirationDays,
  trafficLimit,
  setTrafficLimit
}: AddUserModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm overflow-y-auto pt-20"
          />
          <motion.form 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onSubmit={onSubmit}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 border border-slate-200 my-auto sm:my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Add New User</h3>
                <p className="text-slate-500 text-sm">Create standard or bulk multi-protocol users.</p>
              </div>
              {setIsBulk && (
                <button
                  type="button"
                  onClick={() => setIsBulk(!isBulk)}
                  className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  {isBulk ? 'Switch to Single' : 'Bulk Create'}
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {isBulk ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Users (One per line)</label>
                  <textarea 
                    required
                    autoFocus
                    placeholder={'user1\nuser2\nuser3'}
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono h-32"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Note: Bulk users will use the same passwords and quotas configured below.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Login Username</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    placeholder="e.g. john_doe"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
                  />
                </div>
              )}

              {setPassword && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Portal Password (Optional)</label>
                  <input 
                    type="password"
                    placeholder="Leave blank for no portal access"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {setCiscoPassword && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cisco Password</label>
                    <input 
                      type="text"
                      placeholder="Optional"
                      value={ciscoPassword}
                      onChange={(e) => setCiscoPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-sm"
                    />
                  </div>
                )}
                {setL2tpPassword && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">L2TP Password</label>
                    <input 
                      type="text"
                      placeholder="Optional"
                      value={l2tpPassword}
                      onChange={(e) => setL2tpPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {setMaxConnections && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Connections</label>
                    <input 
                      type="number"
                      min="1"
                      max="10"
                      value={maxConnections}
                      onChange={(e) => setMaxConnections(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>
                )}
                {setProtocol && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Main Protocol</label>
                    <select 
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-sm"
                    >
                      <option value="openvpn">OpenVPN</option>
                      <option value="wireguard">WireGuard</option>
                      <option value="cisco">Cisco AnyConnect</option>
                      <option value="l2tp">L2TP/IPsec</option>
                      <option value="xray">Xray (VLESS/VMess)</option>
                    </select>
                  </div>
                )}
                {setPort && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Port (Optional)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 443"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Active For</label>
                  <select 
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  >
                    <option value="7">1 Week</option>
                    <option value="30">1 Month</option>
                    <option value="90">3 Months</option>
                    <option value="365">1 Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Quota (GB)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="1000"
                    value={trafficLimit}
                    onChange={(e) => setTrafficLimit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 bg-white border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 bg-orange-600 text-white font-semibold py-3 rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 active:scale-95 transition-all"
              >
                {isBulk ? 'Add Users' : 'Add User'}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
