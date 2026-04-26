'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api-client';
import { Loader2, AlertCircle, User as UserIcon, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AddUserModal } from '@/components/users/add-user-modal';

interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    // Address Defect 42: API returns { data, pagination }
    const result = await fetchApi<User[]>('/api/users');

    if (result.error) {
      // Address Defect 39: Show error instead of quenching
      setError(result.error.message);
      toast.error(result.error.message);
    } else {
      // Result data is the users array
      setUsers(result.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

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

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="py-4 px-6 font-semibold text-gray-700">User</th>
                  <th className="py-4 px-6 font-semibold text-gray-700">Role</th>
                  <th className="py-4 px-6 font-semibold text-gray-700">Created</th>
                  <th className="py-4 px-6 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <UserIcon size={16} />
                          </div>
                          <span className="font-medium text-gray-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          user.role === 'admin' ? 'bg-red-100 text-red-700' :
                          user.role === 'reseller' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
