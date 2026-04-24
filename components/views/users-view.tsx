'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { generateOvpnProfile, downloadFile } from '@/lib/ovpn-generator';
import { UserTable, type VpnUser } from '@/components/users/user-table';
import { AddUserModal } from '@/components/users/add-user-modal';
import { UserToolbar } from '@/components/users/user-toolbar';

export default function UsersView() {
  const [users, setUsers] = useState<VpnUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const [protocol, setProtocol] = useState('udp');
  const [expirationDays, setExpirationDays] = useState('30');
  const [trafficLimit, setTrafficLimit] = useState('10');
  const [downloading, setDownloading] = useState<string | null>(null);

  const [servers, setServers] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!data.error) setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers/stats');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) setServers(data);
      }
    } catch (err) {
      console.error("Failed to fetch servers:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchUsers();
      await fetchServers();
    };
    init();
    const interval = setInterval(() => {
      fetchUsers();
      fetchServers();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus })
    });
    fetchUsers();
  };

  const deleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  const handleDownload = async (username: string) => {
    setDownloading(username);
    try {
      const user = users.find(u => u.username === username);
      let userConfig = {};
      
      // user.custom_config might be passed down if we add it to the user object.
      // But VpnUser type might need updating. Assume default for now if not available.
      
      const content = await generateOvpnProfile(username, servers, userConfig);
      downloadFile(`${username}.ovpn`, content);
    } catch (error) {
      console.error("Error generating profile", error);
    }
    setDownloading(null);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expirationDays));

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: trimmedUsername,
          password: password,
          protocol: protocol,
          expires_at: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
          traffic_limit_gb: parseInt(trafficLimit)
        })
      });
      setNewUsername('');
      setPassword('');
      setProtocol('udp');
      setExpirationDays('30');
      setTrafficLimit('10');
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error adding user", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Users</h2>
          <p className="text-sm text-slate-500">View and manage all users with network access.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-orange-700 transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add User</span>
        </button>
      </div>

      <UserToolbar 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
      />

      <UserTable 
        users={filteredUsers} 
        downloading={downloading}
        onDownload={handleDownload}
        onToggleStatus={toggleUserStatus}
        onDelete={deleteUser}
      />

      <AddUserModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddUser}
        newUsername={newUsername}
        setNewUsername={setNewUsername}
        password={password}
        setPassword={setPassword}
        protocol={protocol}
        setProtocol={setProtocol}
        expirationDays={expirationDays}
        setExpirationDays={setExpirationDays}
        trafficLimit={trafficLimit}
        setTrafficLimit={setTrafficLimit}
      />
    </div>
  );
}
