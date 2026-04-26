'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, Activity, Plus, X, Copy, Check, Server, 
  Wifi, WifiOff, Terminal, Shield, Zap, MapPin,
  ChevronDown, Trash2, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  generateRemoteNodeCommand, 
  generateMainServerCommand,
  getTunnelTypeDescription,
  getRecommendedTunnelType 
} from '@/lib/tunnel-commands';

interface TunnelNode {
  id: number;
  name: string;
  location: string;
  country_code?: string;
  flag_emoji?: string;
  remote_ip: string;
  tunnel_port: number;
  tunnel_type: 'hysteria2' | 'reality' | 'wss' | 'grpc';
  tunnel_secret: string;
  local_forward_port: number;
  sni_host: string;
  status: 'pending' | 'online' | 'offline';
  is_active: boolean;
  last_heartbeat?: string;
  active_connections: number;
  total_traffic_bytes: number;
  created_at: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  'DE': '🇩🇪', 'FR': '🇫🇷', 'NL': '🇳🇱', 'GB': '🇬🇧', 'US': '🇺🇸',
  'CA': '🇨🇦', 'JP': '🇯🇵', 'SG': '🇸🇬', 'AU': '🇦🇺', 'TR': '🇹🇷',
  'FI': '🇫🇮', 'SE': '🇸🇪', 'PL': '🇵🇱', 'IT': '🇮🇹', 'ES': '🇪🇸',
  'CH': '🇨🇭', 'AT': '🇦🇹', 'BE': '🇧🇪', 'CZ': '🇨🇿', 'DK': '🇩🇰',
  'AE': '🇦🇪', 'HK': '🇭🇰', 'KR': '🇰🇷', 'IN': '🇮🇳', 'RU': '🇷🇺',
};

const TUNNEL_TYPES = [
  { value: 'hysteria2', label: 'Hysteria2 (QUIC)', recommended: true, description: 'Newest, fastest, most DPI-resistant' },
  { value: 'reality', label: 'Xray Reality', recommended: true, description: 'Looks like real HTTPS to major sites' },
  { value: 'wss', label: 'WSS (WebSocket TLS)', recommended: false, description: 'Good fallback option' },
  { value: 'grpc', label: 'gRPC (HTTP/2)', recommended: false, description: 'Mimics Google services' },
];

export function TunnelNodesView() {
  const [nodes, setNodes] = useState<TunnelNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<TunnelNode | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mainServerIp, setMainServerIp] = useState('');
  const [mainServerPort, setMainServerPort] = useState('8443');

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tunnel-nodes');
      const data = await res.json();
      setNodes(data);
    } catch {
      toast.error('Failed to fetch tunnel nodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Command copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteNode = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tunnel node?')) return;
    
    try {
      await fetch(`/api/tunnel-nodes?id=${id}`, { method: 'DELETE' });
      toast.success('Node deleted');
      fetchNodes();
    } catch {
      toast.error('Failed to delete node');
    }
  };

  const showCommand = (node: TunnelNode) => {
    setSelectedNode(node);
    setShowCommandModal(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Globe className="text-emerald-500" />
            Tunnel Nodes
          </h2>
          <p className="text-sm text-slate-500">DPI-resistant tunnel connections for multi-location VPN</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-200 active:scale-95"
          >
            <Plus size={18} />
            Add Tunnel Node
          </button>
          <div className="flex gap-4 border-l pl-6 border-slate-100">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Nodes</p>
              <p className="text-xl font-bold text-slate-900">{nodes.length}</p>
            </div>
            <div className="text-right border-l pl-4 border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Online</p>
              <p className="text-xl font-bold text-emerald-600">
                {nodes.filter(n => n.status === 'online').length}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Server Config */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Server size={20} className="text-emerald-400" />
              Main Server Configuration
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Enter your main server IP where this panel is installed
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
              Main Server IP
            </label>
            <input
              type="text"
              value={mainServerIp}
              onChange={(e) => setMainServerIp(e.target.value)}
              placeholder="185.x.x.x"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
              Tunnel Listen Port
            </label>
            <input
              type="number"
              value={mainServerPort}
              onChange={(e) => setMainServerPort(e.target.value)}
              placeholder="8443"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Nodes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4 text-slate-400">
            <Activity className="animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Loading nodes...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
            <Globe size={48} className="text-slate-300" />
            <div>
              <p className="font-bold text-slate-600">No tunnel nodes configured</p>
              <p className="text-sm text-slate-400 mt-1">Add your first node to enable multi-location VPN</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Remote IP</th>
                  <th className="px-6 py-4">Tunnel Type</th>
                  <th className="px-6 py-4">Port</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {nodes.map((node) => (
                  <tr key={node.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {node.flag_emoji || COUNTRY_FLAGS[node.country_code || ''] || '🌍'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{node.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                            <MapPin size={10} />
                            {node.location}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                      {node.remote_ip}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-purple-50 text-purple-600">
                        {node.tunnel_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                      {node.tunnel_port}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        node.status === 'online' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : node.status === 'pending'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {node.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {node.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => showCommand(node)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Show Setup Command"
                        >
                          <Terminal size={16} />
                        </button>
                        <button
                          onClick={() => deleteNode(node.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Node"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Node Modal */}
      <AddTunnelNodeModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={() => {
          fetchNodes();
          setShowAddModal(false);
        }}
      />

      {/* Command Modal */}
      <CommandModal
        isOpen={showCommandModal}
        onClose={() => setShowCommandModal(false)}
        node={selectedNode}
        mainServerIp={mainServerIp}
        mainServerPort={parseInt(mainServerPort, 10) || 8443}
        onCopy={copyToClipboard}
        copiedId={copiedId}
      />
    </motion.div>
  );
}

// Add Node Modal Component
function AddTunnelNodeModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    country_code: '',
    remote_ip: '',
    tunnel_port: '443',
    tunnel_type: getRecommendedTunnelType(),
    local_forward_port: '10000',
    sni_host: 'www.google.com',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.remote_ip) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tunnel-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tunnel_port: parseInt(formData.tunnel_port, 10),
          local_forward_port: parseInt(formData.local_forward_port, 10),
          flag_emoji: COUNTRY_FLAGS[formData.country_code] || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to create node');
      
      toast.success('Tunnel node created successfully');
      onSuccess();
      setFormData({
        name: '',
        location: '',
        country_code: '',
        remote_ip: '',
        tunnel_port: '443',
        tunnel_type: getRecommendedTunnelType(),
        local_forward_port: '10000',
        sni_host: 'www.google.com',
      });
    } catch {
      toast.error('Failed to create tunnel node');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-emerald-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Add Tunnel Node</h3>
              <p className="text-emerald-100 text-sm mt-1">Configure a new location for DPI-resistant connection</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Node Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Paris-01"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. Paris, France"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Remote Server IP *
              </label>
              <input
                type="text"
                value={formData.remote_ip}
                onChange={(e) => setFormData(prev => ({ ...prev, remote_ip: e.target.value }))}
                placeholder="185.x.x.x"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Country Code
              </label>
              <select
                value={formData.country_code}
                onChange={(e) => setFormData(prev => ({ ...prev, country_code: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
              >
                <option value="">Select Country</option>
                {Object.entries(COUNTRY_FLAGS).map(([code, flag]) => (
                  <option key={code} value={code}>{flag} {code}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Tunnel Type
              </label>
              <select
                value={formData.tunnel_type}
                onChange={(e) => setFormData(prev => ({ ...prev, tunnel_type: e.target.value as any }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
              >
                {TUNNEL_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} {type.recommended ? '(Recommended)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {getTunnelTypeDescription(formData.tunnel_type)}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Tunnel Port
              </label>
              <input
                type="number"
                value={formData.tunnel_port}
                onChange={(e) => setFormData(prev => ({ ...prev, tunnel_port: e.target.value }))}
                placeholder="443"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Port 443 recommended for HTTPS mimicry</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Local Forward Port
              </label>
              <input
                type="number"
                value={formData.local_forward_port}
                onChange={(e) => setFormData(prev => ({ ...prev, local_forward_port: e.target.value }))}
                placeholder="10000"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                SNI Host (for DPI bypass)
              </label>
              <input
                type="text"
                value={formData.sni_host}
                onChange={(e) => setFormData(prev => ({ ...prev, sni_host: e.target.value }))}
                placeholder="www.google.com"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Fake SNI to bypass DPI detection</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <RefreshCw className="animate-spin" size={20} />
              ) : (
                <>
                  <Plus size={20} />
                  Create Tunnel Node
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Command Modal Component
function CommandModal({
  isOpen,
  onClose,
  node,
  mainServerIp,
  mainServerPort,
  onCopy,
  copiedId,
}: {
  isOpen: boolean;
  onClose: () => void;
  node: TunnelNode | null;
  mainServerIp: string;
  mainServerPort: number;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [activeTab, setActiveTab] = useState<'remote' | 'main'>('remote');

  if (!isOpen || !node) return null;

  const remoteCommand = generateRemoteNodeCommand(node, mainServerIp || 'YOUR_MAIN_SERVER_IP', mainServerPort);
  const mainCommand = generateMainServerCommand(
    { ip: mainServerIp || 'YOUR_MAIN_SERVER_IP', port: mainServerPort },
    node.tunnel_type,
    node.tunnel_secret,
    node.local_forward_port
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="bg-slate-900 px-8 py-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl">
                {node.flag_emoji || COUNTRY_FLAGS[node.country_code || ''] || '🌍'}
              </div>
              <div>
                <h3 className="text-xl font-bold">{node.name}</h3>
                <p className="text-slate-400 text-sm">{node.location} - Setup Commands</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Warning if no main server IP */}
          {!mainServerIp && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-amber-800 text-sm font-medium">
                Please enter your Main Server IP in the configuration section above to generate correct commands.
              </p>
            </div>
          )}

          {/* Tunnel Info */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Tunnel Type</p>
                <p className="font-bold text-slate-900">{node.tunnel_type.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Remote IP</p>
                <p className="font-mono font-bold text-slate-900">{node.remote_ip}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Port</p>
                <p className="font-mono font-bold text-slate-900">{node.tunnel_port}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Tunnel Secret</p>
                  <p className="font-mono text-sm text-slate-900">
                    {showSecret ? node.tunnel_secret : '••••••••••••••••••••'}
                  </p>
                </div>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('remote')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'remote'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Remote Node Command
            </button>
            <button
              onClick={() => setActiveTab('main')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'main'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Main Server Command
            </button>
          </div>

          {/* Command Display */}
          <div className="relative">
            <div className="bg-slate-900 rounded-2xl p-6 overflow-x-auto">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                {activeTab === 'remote' ? remoteCommand : mainCommand}
              </pre>
            </div>
            <button
              onClick={() => onCopy(activeTab === 'remote' ? remoteCommand : mainCommand, `${node.id}-${activeTab}`)}
              className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all"
            >
              {copiedId === `${node.id}-${activeTab}` ? (
                <>
                  <Check size={14} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy Command
                </>
              )}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 space-y-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Shield size={16} className="text-emerald-500" />
              Setup Instructions
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
              <li>First, run the <strong>Main Server Command</strong> on your panel server to start the tunnel listener</li>
              <li>Then, run the <strong>Remote Node Command</strong> on the remote server ({node.location})</li>
              <li>The tunnel will establish automatically and traffic will flow through securely</li>
              <li>Use the systemd service for auto-start on remote server reboot</li>
            </ol>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
