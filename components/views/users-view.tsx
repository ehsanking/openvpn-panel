'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { generateOvpnProfile, downloadFile } from '@/lib/ovpn-generator';
import { UserTable, type VpnUser } from '@/components/users/user-table';
import { AddUserModal } from '@/components/users/add-user-modal';
import { UserToolbar } from '@/components/users/user-toolbar';

const MySwal = withReactContent(Swal);

export default function UsersView() {
  const [users, setUsers] = useState<VpnUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const [protocol, setProtocol] = useState('openvpn');
  const [port, setPort] = useState('');
  const [expirationDays, setExpirationDays] = useState('30');
  const [trafficLimit, setTrafficLimit] = useState('10');
  const [downloading, setDownloading] = useState<string | null>(null);

  const [servers, setServers] = useState<any[]>([]);

  const [isBulk, setIsBulk] = useState(false);
  const [ciscoPassword, setCiscoPassword] = useState('');
  const [l2tpPassword, setL2tpPassword] = useState('');
  const [maxConnections, setMaxConnections] = useState('1');

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
    try {
      await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId, status: newStatus })
      });
      MySwal.fire({
        icon: 'success',
        title: `User ${newStatus === 'active' ? 'enabled' : 'disabled'}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      fetchUsers();
    } catch {
      MySwal.fire('Error', 'Failed to toggle status', 'error');
    }
  };

  const deleteUser = async (userId: number) => {
    const result = await MySwal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
        MySwal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'The user has been deleted.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        fetchUsers();
      } catch {
        MySwal.fire('Error', 'Failed to delete user', 'error');
      }
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
    if (!newUsername.trim()) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expirationDays));

    try {
      let payload;
      if (isBulk) {
        const usernames = newUsername.split('\n').map(u => u.trim()).filter(u => u);
        payload = usernames.map(u => ({
          username: u,
          password: password,
          cisco_password: ciscoPassword,
          l2tp_password: l2tpPassword,
          max_connections: parseInt(maxConnections),
          main_protocol: protocol,
          port: port ? parseInt(port) : null,
          expires_at: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
          traffic_limit_gb: parseInt(trafficLimit)
        }));
      } else {
        payload = { 
          username: newUsername.trim(),
          password: password,
          cisco_password: ciscoPassword,
          l2tp_password: l2tpPassword,
          max_connections: parseInt(maxConnections),
          main_protocol: protocol,
          port: port ? parseInt(port) : null,
          expires_at: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
          traffic_limit_gb: parseInt(trafficLimit)
        };
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const resData = await res.json();
      
      if (!res.ok || resData.error) {
        MySwal.fire({
          icon: 'error',
          title: 'Failed to add user',
          text: resData.error || 'Check port conflict or duplicates.',
          confirmButtonColor: '#ea580c'
        });
        return;
      }

      MySwal.fire({
        icon: 'success',
        title: 'User created successfully',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });

      setNewUsername('');
      setPassword('');
      setCiscoPassword('');
      setL2tpPassword('');
      setMaxConnections('1');
      setProtocol('openvpn');
      setPort('');
      setExpirationDays('30');
      setTrafficLimit('10');
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error adding user/users:", error);
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'An unexpected error occurred.',
        confirmButtonColor: '#ea580c'
      });
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
        isBulk={isBulk}
        setIsBulk={setIsBulk}
        password={password}
        setPassword={setPassword}
        ciscoPassword={ciscoPassword}
        setCiscoPassword={setCiscoPassword}
        l2tpPassword={l2tpPassword}
        setL2tpPassword={setL2tpPassword}
        maxConnections={maxConnections}
        setMaxConnections={setMaxConnections}
        protocol={protocol}
        setProtocol={setProtocol}
        port={port}
        setPort={setPort}
        expirationDays={expirationDays}
        setExpirationDays={setExpirationDays}
        trafficLimit={trafficLimit}
        setTrafficLimit={setTrafficLimit}
      />
    </div>
  );
}
