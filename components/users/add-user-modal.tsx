'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserSchema, UserFormData } from '@/lib/schemas';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { X, UserPlus, Loader2, Network, Shield, Key, Calendar, Database, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onSuccess: () => void;
}

interface Inbound {
  id: number;
  name: string;
}

export function AddUserModal({ onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inbounds, setInbounds] = useState<Inbound[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (inbounds.length === 0) {
        fetchApi('/api/inbounds').then((res: any) => {
          if (res.inbounds) {
            setInbounds(res.inbounds);
          }
        }).catch(err => console.error(err));
      }
    }
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<UserFormData>({
    resolver: zodResolver(UserSchema) as any,
    defaultValues: {
      role: 'user',
      status: 'active',
      traffic_limit_gb: 10,
      max_connections: 1,
      inboundIds: []
    }
  });

  const selectedInbounds = watch('inboundIds') || [];

  const toggleInbound = (id: number) => {
    if (selectedInbounds.includes(id)) {
      setValue('inboundIds', selectedInbounds.filter(inboundId => inboundId !== id));
    } else {
      setValue('inboundIds', [...selectedInbounds, id]);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    if (!data.inboundIds || data.inboundIds.length === 0) {
      toast.error('Select at least one inbound for this user');
      return;
    }
    setIsSubmitting(true);
    const result = await fetchApi('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (result.error) {
      toast.error(result.error.message);
    } else {
      toast.success('User account provisioned');
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
        <UserPlus size={18} />
        Provision Account
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
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Provision V-Stack User</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Identity & Access Management</p>
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
                        <Shield size={12} className="text-blue-500" />
                        Identity Name
                      </label>
                      <input
                        {...register('username')}
                        type="text"
                        className={`w-full px-4 py-2.5 rounded-xl border font-bold text-sm focus:ring-4 transition-all ${
                          errors.username ? 'border-red-200 bg-red-50 focus:ring-red-50 text-red-900' : 'border-slate-100 bg-slate-50 focus:ring-blue-50 focus:border-blue-200'
                        }`}
                        placeholder="Username"
                      />
                      {errors.username && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase">{errors.username.message}</p>}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <Key size={12} className="text-orange-500" />
                        Secure Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          {...register('password')}
                          type="text"
                          className={`w-full px-4 py-2.5 rounded-xl border font-mono text-xs font-bold focus:ring-4 transition-all ${
                            errors.password ? 'border-red-200 bg-red-50 focus:ring-red-50 text-red-900' : 'border-slate-100 bg-slate-50 focus:ring-blue-50 focus:border-blue-200'
                          }`}
                          placeholder="Password"
                        />
                        <button 
                          type="button" 
                          onClick={() => setValue('password', Math.random().toString(36).slice(-10).toUpperCase())}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] hover:bg-slate-800 transition-all active:scale-95"
                        >
                          Auto
                        </button>
                      </div>
                      {errors.password && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase">{errors.password.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Stack Status</label>
                        <select
                          {...register('status')}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                        >
                          <option value="active">Active</option>
                          <option value="disabled">Disabled</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Identity Role</label>
                        <select
                          {...register('role')}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="reseller">Reseller</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <Calendar size={12} className="text-purple-500" />
                        Stack Expiry
                      </label>
                      <input
                        {...register('expires_at')}
                        type="datetime-local"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-50 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Database size={12} className="text-emerald-500" />
                      Traffic Quota (GB)
                    </label>
                    <input
                      {...register('traffic_limit_gb', { valueAsNumber: true })}
                      type="number"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-white font-bold text-sm focus:ring-4 focus:ring-emerald-50 transition-all"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Activity size={12} className="text-pink-500" />
                      IP Constraints
                    </label>
                    <input
                      {...register('max_connections', { valueAsNumber: true })}
                      type="number"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-white font-bold text-sm focus:ring-4 focus:ring-pink-50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Network size={14} className="text-blue-500" />
                      Inbound Asset Assignments
                   </label>
                   {inbounds.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {inbounds.map(inbound => (
                          <label key={inbound.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedInbounds.includes(inbound.id) ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              checked={selectedInbounds.includes(inbound.id)}
                              onChange={() => toggleInbound(inbound.id)}
                            />
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedInbounds.includes(inbound.id) ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-200'
                            }`}>
                              {selectedInbounds.includes(inbound.id) && <div className="w-1.5 h-1.5 rounded-full bg-white transition-all transform scale-100" />}
                            </div>
                            <span className="text-xs font-bold text-slate-700 tracking-tight">{inbound.name}</span>
                          </label>
                        ))}
                     </div>
                   ) : (
                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No active inbounds found</p>
                     </div>
                   )}
                </div>

                <div className="pt-4">
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <Shield size={20} />
                        Confirm Provisioning
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
