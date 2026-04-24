'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newUsername: string;
  setNewUsername: (val: string) => void;
  password?: string;
  setPassword?: (val: string) => void;
  protocol?: string;
  setProtocol?: (val: string) => void;
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
  password = '',
  setPassword,
  protocol = 'udp',
  setProtocol,
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.form 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onSubmit={onSubmit}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-200"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-2">Add New User</h3>
            <p className="text-slate-500 text-sm mb-6">Choose a login name and usage limits.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Login</label>
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
              {setProtocol && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Protocol</label>
                  <select 
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  >
                    <option value="udp">UDP (Recommended)</option>
                    <option value="tcp">TCP (Reliable)</option>
                  </select>
                </div>
              )}
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
                Add User
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
