'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserSchema, UserFormData } from '@/lib/schemas';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { X, UserPlus, Loader2, Network } from 'lucide-react';
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

  // Address Defect 40: Shared Zod Schema validation
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
      traffic_limit_gb: 0,
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
    setIsSubmitting(true);
    const result = await fetchApi('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (result.error) {
      toast.error(result.error.message);
    } else {
      toast.success('User created successfully');
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
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm shadow-blue-200"
      >
        <UserPlus size={20} />
        Add User
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 border-l-4 border-blue-500 pl-4">Create New User</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    {...register('username')}
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all ${
                      errors.username ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100'
                    }`}
                    placeholder="e.g. johndoe"
                  />
                  {errors.username && (
                    <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="flex gap-2">
                    <input
                      {...register('password')}
                      type="text"
                      className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all ${
                        errors.password ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100'
                      }`}
                      placeholder="Min 6 characters"
                    />
                    <button 
                      type="button" 
                      onClick={() => setValue('password', Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-3).toUpperCase())}
                      className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap text-sm border border-gray-200"
                    >
                      Generate
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      {...register('status')}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      {...register('role')}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all bg-white"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="reseller">Reseller</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Traffic Limit (GB)</label>
                    <input
                      {...register('traffic_limit_gb', { valueAsNumber: true })}
                      type="number"
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all border-gray-200 focus:ring-blue-100"
                      placeholder="0 for unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max IPs/Connections</label>
                    <input
                      {...register('max_connections', { valueAsNumber: true })}
                      type="number"
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all border-gray-200 focus:ring-blue-100"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    {...register('expires_at')}
                    type="datetime-local"
                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all border-gray-200 focus:ring-blue-100"
                  />
                </div>

                {inbounds.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                       <Network size={16} className="text-blue-500" />
                       Assign Inbounds
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                      {inbounds.map(inbound => (
                        <label key={inbound.id} className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded text-blue-600 focus:ring-blue-500"
                            checked={selectedInbounds.includes(inbound.id)}
                            onChange={() => toggleInbound(inbound.id)}
                          />
                          <span className="text-sm font-medium text-gray-700">{inbound.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      'Create User Account'
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
