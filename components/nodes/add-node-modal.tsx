'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ServerSchema, ServerFormData } from '@/lib/schemas';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { X, Plus, Loader2, Globe, Shield, Zap, Network, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onSuccess: () => void;
}

export function AddNodeModal({ onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<ServerFormData>({
    resolver: zodResolver(ServerSchema) as any,
    defaultValues: {
      protocol: 'udp',
      ports: '1194, 443',
      supports_openvpn: true,
      supports_cisco: false,
      supports_l2tp: false,
      supports_wireguard: false,
      supports_xray: false,
    }
  });

  const onSubmit = async (data: ServerFormData) => {
    setIsSubmitting(true);
    // Convert comma string ports to array of numbers for the API
    const portsArray = data.ports.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
    
    const result = await fetchApi('/api/servers', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        ports: portsArray
      }),
    });

    if (result.error) {
      toast.error(result.error.message);
    } else {
      toast.success('Node successfully integrated into the cluster');
      setIsOpen(false);
      reset();
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-200 active:scale-95"
      >
        <Plus size={18} />
        Initialize Node
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Provision V-Stack Node</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Server Infrastructure</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <Globe size={12} className="text-blue-500" />
                        Node Label
                      </label>
                      <input
                        {...register('name')}
                        type="text"
                        className={`w-full px-4 py-2.5 rounded-xl border font-bold text-sm focus:ring-4 transition-all ${
                          errors.name ? 'border-red-200 bg-red-50 focus:ring-red-50 text-red-900' : 'border-slate-100 bg-slate-50 focus:ring-blue-50 focus:border-blue-200'
                        }`}
                        placeholder="e.g. Frankfurt-Core-01"
                      />
                      {errors.name && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase">{errors.name.message}</p>}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <Radio size={12} className="text-orange-500" />
                        Endpoint IP
                      </label>
                      <input
                        {...register('ip_address')}
                        type="text"
                        className={`w-full px-4 py-2.5 rounded-xl border font-mono text-xs font-bold focus:ring-4 transition-all ${
                          errors.ip_address ? 'border-red-200 bg-red-50 focus:ring-red-50 text-red-900' : 'border-slate-100 bg-slate-50 focus:ring-blue-50 focus:border-blue-200'
                        }`}
                        placeholder="1.2.3.4"
                      />
                      {errors.ip_address && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase">{errors.ip_address.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <Zap size={12} className="text-purple-500" />
                        Management Ports
                      </label>
                      <input
                        {...register('ports')}
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-50 transition-all"
                        placeholder="1194, 443, 80"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Comma separated list of integers</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Primary Transport</label>
                      <select
                        {...register('protocol')}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                      >
                        <option value="udp">UDP (Recommended)</option>
                        <option value="tcp">TCP</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pb-4">
                   <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Shield size={14} className="text-blue-500" />
                      Supported Protocol Stack
                   </label>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'supports_openvpn', label: 'OpenVPN Standard', icon: Zap, color: 'text-orange-500' },
                        { id: 'supports_cisco', label: 'Cisco AnyConnect', icon: Shield, color: 'text-indigo-500' },
                        { id: 'supports_l2tp', label: 'L2TP/IPsec Legacy', icon: Radio, color: 'text-slate-500' },
                        { id: 'supports_wireguard', label: 'WireGuard (Next Gen)', icon: Shield, color: 'text-blue-500' },
                        { id: 'supports_xray', label: 'X-Ray Core (VLESS)', icon: Network, color: 'text-purple-500' },
                      ].map((proto) => {
                        const isChecked = !!watch(proto.id as any);
                        return (
                          <label 
                            key={proto.id} 
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              isChecked ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              className="hidden"
                              {...register(proto.id as any)}
                            />
                            <div className={`p-2 rounded-lg ${isChecked ? 'bg-white/10' : 'bg-slate-50'}`}>
                               <proto.icon size={16} className={isChecked ? 'text-white' : proto.color} />
                            </div>
                            <span className="text-xs font-bold tracking-tight">{proto.label}</span>
                          </label>
                        );
                      })}
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <Plus size={20} />
                        Confirm Integration
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
