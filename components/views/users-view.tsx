'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api-client';
import { Loader2, AlertCircle, User as UserIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: number;
  username: string;
  role: string;
  status: string;
  created_at: string;
}

export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    const result = await fetchApi<User[]>('/api/users');
    if (result.error) {
      setError(result.error.message);
      toast.error(result.error.message);
    } else {
      setUsers(result.data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (userId: number, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`User "${username}" deleted.`);
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const data = await res.json();
        toast.error(data.error?.message || 'Failed to delete user.');
      }
    } catch {
      toast.error('Network error while deleting user.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500 bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="mb-4" size={32} />
        <p className="font-medium">{error}</p>
        <button
          onClick={loadUsers}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-4 px-4 font-semibold text-gray-700">User</th>
            <th className="py-4 px-4 font-semibold text-gray-700">Role</th>
            <th className="py-4 px-4 font-semibold text-gray-700">Status</th>
            <th className="py-4 px-4 font-semibold text-gray-700">Created</th>
            <th className="py-4 px-4 font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center text-gray-500">
                No users found.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <UserIcon size={16} />
                    </div>
                    <span className="font-medium text-gray-900">{user.username}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    user.role === 'admin'    ? 'bg-red-100 text-red-700' :
                    user.role === 'reseller' ? 'bg-purple-100 text-purple-700' :
                                               'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    user.status === 'active'    ? 'bg-green-100 text-green-700' :
                    user.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-gray-100 text-gray-600'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="py-4 px-4">
                  <button
                    onClick={() => handleDelete(user.id, user.username)}
                    disabled={deletingId === user.id}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                    title="Delete user"
                  >
                    {deletingId === user.id
                      ? <Loader2 size={18} className="animate-spin" />
                      : <Trash2 size={18} />
                    }
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
