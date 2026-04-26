'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, X } from 'lucide-react';
import { format } from 'date-fns';

export function ServerHistoryModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
       
      setLoading(true);
      fetch('/api/servers/history')
        .then(res => res.json())
        .then(data => {
          if (!data.error) setHistory(data);
          setLoading(false);
        });
    }
  }, [isOpen]);

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
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh] border border-slate-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-2">
                <History className="text-slate-400" size={18} />
                <h3 className="font-bold text-slate-900">Server Status History</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {loading ? (
                <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-10">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-10">No history available yet.</div>
              ) : (
                <div className="space-y-3">
                  {history.map((log: any) => (
                    <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${log.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-bold text-slate-800">{log.server_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.ip_address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 sm:mt-0 text-slate-500">
                        <p className="text-xs">Load: <strong className="text-slate-700">{log.load_score}%</strong></p>
                        <p className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
