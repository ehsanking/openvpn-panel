'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api-client';
import { Loader2, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AddUserModal } from '@/components/users/add-user-modal';
import { UserTable, VpnUser } from '@/components/users/user-table';

export function UsersView() {
  const [users, setUsers] = useState<VpnUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    const result = await fetchApi<VpnUser[]>('/api/users');

    if (result.error) {
      setError(result.error.message);
      toast.error(result.error.message);
    } else {
      setUsers(result.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDownload = (username: string) => {
    // Opens the user-facing portal where every assigned inbound config can be
    // copied / scanned / downloaded individually.
    const url = `/subscription/${encodeURIComponent(username)}`;
    window.open(url, '_blank', 'noopener');
  };

  const handleToggleStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error();
      loadUsers();
      toast.success(`User ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to change status');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      loadUsers();
      toast.success('User deleted successfully');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-500" />
            User Management
          </h2>
          <p className="text-gray-500 mt-1">Manage VPN accounts, resellers, and active user sessions.</p>
        </div>
        <AddUserModal onSuccess={loadUsers} />
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Loading users...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500 bg-red-50 rounded-xl border border-red-100 m-4">
            <AlertCircle className="mb-4" size={32} />
            <p className="font-medium">{error}</p>
            <button 
              onClick={loadUsers}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <UserTable
            users={users}
            onDownload={handleDownload}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
