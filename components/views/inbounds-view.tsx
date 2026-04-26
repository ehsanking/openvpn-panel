'use client';

import React, { useState, useEffect } from 'react';
import { Network, Plus, Server, X, Edit2, Trash2, Shield, Activity, Settings, Globe, Lock, Key, Wifi, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Protocol categories and their options
const PROTOCOL_CATEGORIES = {
  vpn: {
    label: 'Traditional VPN',
    protocols: [
      { value: 'openvpn', label: 'OpenVPN', description: 'UDP/TCP tunneling' },
      { value: 'wireguard', label: 'WireGuard', description: 'Modern, fast VPN' },
      { value: 'cisco', label: 'Cisco AnyConnect', description: 'Ocserv compatible' },
      { value: 'l2tp', label: 'L2TP/IPsec', description: 'Legacy IPsec tunnel' },
    ]
  },
  xray: {
    label: 'Xray Core',
    protocols: [
      { value: 'vless', label: 'VLESS', description: 'XTLS-Reality support' },
      { value: 'vmess', label: 'VMess', description: 'WebSocket/gRPC' },
      { value: 'trojan', label: 'Trojan', description: 'TLS masquerade' },
      { value: 'shadowsocks', label: 'Shadowsocks', description: 'AEAD encryption' },
    ]
  }
};

interface Inbound {
  id: number;
  name: string;
  protocol: string;
  port: number;
  server_address: string;
  remark: string;
  status: string;
  created_at: string;
  // Protocol-specific fields
  ovpn_protocol?: string;
  ovpn_cipher?: string;
  wg_public_key?: string;
  wg_address?: string;
  cisco_auth_method?: string;
  l2tp_psk?: string;
  xray_network?: string;
  xray_security?: string;
  xray_uuid?: string;
}

interface InboundFormData {
  name: string;
  protocol: string;
  port: string;
  server_address: string;
  remark: string;
  // OpenVPN
  ovpn_protocol: string;
  ovpn_cipher: string;
  ovpn_auth: string;
  ovpn_dev: string;
  // WireGuard
  wg_private_key: string;
  wg_public_key: string;
  wg_address: string;
  wg_dns: string;
  wg_mtu: string;
  // Cisco
  cisco_auth_method: string;
  cisco_max_clients: string;
  cisco_dpd: string;
  // L2TP
  l2tp_psk: string;
  l2tp_dns: string;
  l2tp_local_ip: string;
  l2tp_remote_ip_range: string;
  // Xray
  xray_uuid: string;
  xray_flow: string;
  xray_network: string;
  xray_security: string;
  xray_sni: string;
  xray_fingerprint: string;
  xray_public_key: string;
  xray_short_id: string;
  xray_path: string;
  xray_service_name: string;
  xray_encryption: string;
}

const initialFormData: InboundFormData = {
  name: '',
  protocol: 'openvpn',
  port: '',
  server_address: '',
  remark: '',
  // OpenVPN defaults
  ovpn_protocol: 'udp',
  ovpn_cipher: 'AES-256-GCM',
  ovpn_auth: 'SHA256',
  ovpn_dev: 'tun',
  // WireGuard defaults
  wg_private_key: '',
  wg_public_key: '',
  wg_address: '10.0.0.1/24',
  wg_dns: '1.1.1.1',
  wg_mtu: '1420',
  // Cisco defaults
  cisco_auth_method: 'password',
  cisco_max_clients: '100',
  cisco_dpd: '90',
  // L2TP defaults
  l2tp_psk: '',
  l2tp_dns: '8.8.8.8',
  l2tp_local_ip: '10.10.10.1',
  l2tp_remote_ip_range: '10.10.10.2-10.10.10.254',
  // Xray defaults
  xray_uuid: '',
  xray_flow: 'xtls-rprx-vision',
  xray_network: 'tcp',
  xray_security: 'reality',
  xray_sni: 'www.google.com',
  xray_fingerprint: 'chrome',
  xray_public_key: '',
  xray_short_id: '',
  xray_path: '/ws',
  xray_service_name: 'grpc',
  xray_encryption: 'chacha20-ietf-poly1305',
};

const getProtocolIcon = (protocol: string) => {
  switch (protocol) {
    case 'openvpn': return <Lock size={16} />;
    case 'wireguard': return <Wifi size={16} />;
    case 'cisco': return <Globe size={16} />;
    case 'l2tp': return <Key size={16} />;
    case 'vless':
    case 'vmess':
    case 'trojan':
    case 'shadowsocks':
      return <Radio size={16} />;
    default: return <Shield size={16} />;
  }
};

const getProtocolColor = (protocol: string) => {
  switch (protocol) {
    case 'openvpn': return 'bg-orange-50 text-orange-600';
    case 'wireguard': return 'bg-purple-50 text-purple-600';
    case 'cisco': return 'bg-blue-50 text-blue-600';
    case 'l2tp': return 'bg-green-50 text-green-600';
    case 'vless': return 'bg-cyan-50 text-cyan-600';
    case 'vmess': return 'bg-pink-50 text-pink-600';
    case 'trojan': return 'bg-red-50 text-red-600';
    case 'shadowsocks': return 'bg-indigo-50 text-indigo-600';
    default: return 'bg-slate-50 text-slate-600';
  }
};

const getDefaultPort = (protocol: string) => {
  switch (protocol) {
    case 'openvpn': return '1194';
    case 'wireguard': return '51820';
    case 'cisco': return '443';
    case 'l2tp': return '1701';
    case 'vless':
    case 'vmess':
    case 'trojan': return '443';
    case 'shadowsocks': return '8388';
    default: return '443';
  }
};

export default function InboundsView() {
  const [inbounds, setInbounds] = useState<Inbound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<InboundFormData>(initialFormData);

  const fetchInbounds = async () => {
    try {
      const res = await fetch('/api/inbounds');
      const data = await res.json();
      if (data.inbounds) {
        setInbounds(data.inbounds);
      }
    } catch {
      toast.error('Failed to load inbounds');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInbounds();
  }, []);

  const updateFormField = (field: keyof InboundFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Auto-set default port when protocol changes
      if (field === 'protocol') {
        newData.port = getDefaultPort(value);
        // Auto-generate UUID for Xray protocols
        if (['vless', 'vmess', 'trojan'].includes(value) && !newData.xray_uuid) {
          newData.xray_uuid = uuidv4();
        }
      }
      return newData;
    });
  };

  const generateWireGuardKeys = () => {
    // In production, this would call a server endpoint
    // For now, we'll generate placeholder keys
    const fakePrivateKey = btoa(Array.from({ length: 32 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join('')).slice(0, 44);
    const fakePublicKey = btoa(Array.from({ length: 32 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join('')).slice(0, 44);
    setFormData(prev => ({
      ...prev,
      wg_private_key: fakePrivateKey,
      wg_public_key: fakePublicKey,
    }));
    toast.success('WireGuard keys generated');
  };

  const generateL2TPPSK = () => {
    const psk = Array.from({ length: 32 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))
    ).join('');
    setFormData(prev => ({ ...prev, l2tp_psk: psk }));
    toast.success('Pre-shared key generated');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.port || !formData.server_address) {
      return toast.error('Name, server address and port are required');
    }
    
    try {
      const res = await fetch('/api/inbounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          port: parseInt(formData.port),
          wg_mtu: parseInt(formData.wg_mtu) || 1420,
          cisco_max_clients: parseInt(formData.cisco_max_clients) || 100,
          cisco_dpd: parseInt(formData.cisco_dpd) || 90,
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create inbound');
      }
      
      toast.success('Inbound created successfully');
      setFormData(initialFormData);
      setIsAdding(false);
      fetchInbounds();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create inbound');
    }
  };

  const handleDelete = async (inbound: Inbound) => {
    if (!confirm(`Delete inbound ${inbound.name}?`)) return;
    try {
      const res = await fetch(`/api/inbounds/${inbound.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInbounds();
        toast.success('Inbound deleted');
      } else {
        toast.error('Failed to delete inbound');
      }
    } catch {
      toast.error('Failed to delete inbound');
    }
  };

  const renderProtocolConfig = () => {
    switch (formData.protocol) {
      case 'openvpn':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
            <h4 className="col-span-full text-xs font-bold text-orange-700 uppercase tracking-widest flex items-center gap-2">
              <Lock size={14} />
              OpenVPN Configuration
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Protocol</label>
              <select
                value={formData.ovpn_protocol}
                onChange={(e) => updateFormField('ovpn_protocol', e.target.value)}
                className="w-full bg-white border border-orange-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="udp">UDP (Recommended)</option>
                <option value="tcp">TCP</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cipher</label>
              <select
                value={formData.ovpn_cipher}
                onChange={(e) => updateFormField('ovpn_cipher', e.target.value)}
                className="w-full bg-white border border-orange-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="AES-256-GCM">AES-256-GCM (Recommended)</option>
                <option value="AES-128-GCM">AES-128-GCM</option>
                <option value="CHACHA20-POLY1305">CHACHA20-POLY1305</option>
                <option value="AES-256-CBC">AES-256-CBC (Legacy)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Auth Digest</label>
              <select
                value={formData.ovpn_auth}
                onChange={(e) => updateFormField('ovpn_auth', e.target.value)}
                className="w-full bg-white border border-orange-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="SHA256">SHA256</option>
                <option value="SHA384">SHA384</option>
                <option value="SHA512">SHA512</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Device Type</label>
              <select
                value={formData.ovpn_dev}
                onChange={(e) => updateFormField('ovpn_dev', e.target.value)}
                className="w-full bg-white border border-orange-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="tun">TUN (Layer 3)</option>
                <option value="tap">TAP (Layer 2)</option>
              </select>
            </div>
          </div>
        );

      case 'wireguard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
            <h4 className="col-span-full text-xs font-bold text-purple-700 uppercase tracking-widest flex items-center gap-2">
              <Wifi size={14} />
              WireGuard Configuration
            </h4>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Server Private Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.wg_private_key}
                  onChange={(e) => updateFormField('wg_private_key', e.target.value)}
                  className="flex-1 bg-white border border-purple-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Base64 private key"
                />
                <button
                  type="button"
                  onClick={generateWireGuardKeys}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Server Public Key</label>
              <input
                type="text"
                value={formData.wg_public_key}
                onChange={(e) => updateFormField('wg_public_key', e.target.value)}
                className="w-full bg-white border border-purple-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Base64 public key"
                readOnly
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Server Address</label>
              <input
                type="text"
                value={formData.wg_address}
                onChange={(e) => updateFormField('wg_address', e.target.value)}
                className="w-full bg-white border border-purple-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="10.0.0.1/24"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DNS Server</label>
              <input
                type="text"
                value={formData.wg_dns}
                onChange={(e) => updateFormField('wg_dns', e.target.value)}
                className="w-full bg-white border border-purple-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="1.1.1.1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">MTU</label>
              <input
                type="number"
                value={formData.wg_mtu}
                onChange={(e) => updateFormField('wg_mtu', e.target.value)}
                className="w-full bg-white border border-purple-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="1420"
              />
            </div>
          </div>
        );

      case 'cisco':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <h4 className="col-span-full text-xs font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
              <Globe size={14} />
              Cisco AnyConnect (Ocserv) Configuration
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Auth Method</label>
              <select
                value={formData.cisco_auth_method}
                onChange={(e) => updateFormField('cisco_auth_method', e.target.value)}
                className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="password">Password</option>
                <option value="certificate">Certificate</option>
                <option value="both">Password + Certificate</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Clients</label>
              <input
                type="number"
                value={formData.cisco_max_clients}
                onChange={(e) => updateFormField('cisco_max_clients', e.target.value)}
                className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DPD Timeout (seconds)</label>
              <input
                type="number"
                value={formData.cisco_dpd}
                onChange={(e) => updateFormField('cisco_dpd', e.target.value)}
                className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="90"
              />
            </div>
          </div>
        );

      case 'l2tp':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50/50 rounded-xl border border-green-100">
            <h4 className="col-span-full text-xs font-bold text-green-700 uppercase tracking-widest flex items-center gap-2">
              <Key size={14} />
              L2TP/IPsec Configuration
            </h4>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pre-Shared Key (PSK)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.l2tp_psk}
                  onChange={(e) => updateFormField('l2tp_psk', e.target.value)}
                  className="flex-1 bg-white border border-green-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="IPsec pre-shared key"
                />
                <button
                  type="button"
                  onClick={generateL2TPPSK}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all"
                >
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DNS Server</label>
              <input
                type="text"
                value={formData.l2tp_dns}
                onChange={(e) => updateFormField('l2tp_dns', e.target.value)}
                className="w-full bg-white border border-green-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="8.8.8.8"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Local IP</label>
              <input
                type="text"
                value={formData.l2tp_local_ip}
                onChange={(e) => updateFormField('l2tp_local_ip', e.target.value)}
                className="w-full bg-white border border-green-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="10.10.10.1"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remote IP Range</label>
              <input
                type="text"
                value={formData.l2tp_remote_ip_range}
                onChange={(e) => updateFormField('l2tp_remote_ip_range', e.target.value)}
                className="w-full bg-white border border-green-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="10.10.10.2-10.10.10.254"
              />
            </div>
          </div>
        );

      case 'vless':
      case 'vmess':
      case 'trojan':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-cyan-50/50 rounded-xl border border-cyan-100">
            <h4 className="col-span-full text-xs font-bold text-cyan-700 uppercase tracking-widest flex items-center gap-2">
              <Radio size={14} />
              {formData.protocol.toUpperCase()} Configuration (Xray Core)
            </h4>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">UUID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.xray_uuid}
                  onChange={(e) => updateFormField('xray_uuid', e.target.value)}
                  className="flex-1 bg-white border border-cyan-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  placeholder="UUID for authentication"
                />
                <button
                  type="button"
                  onClick={() => updateFormField('xray_uuid', uuidv4())}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-bold hover:bg-cyan-700 transition-all"
                >
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Network</label>
              <select
                value={formData.xray_network}
                onChange={(e) => updateFormField('xray_network', e.target.value)}
                className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="tcp">TCP</option>
                <option value="ws">WebSocket</option>
                <option value="grpc">gRPC</option>
                <option value="http">HTTP/2</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Security</label>
              <select
                value={formData.xray_security}
                onChange={(e) => updateFormField('xray_security', e.target.value)}
                className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="reality">Reality (Recommended)</option>
                <option value="tls">TLS</option>
                <option value="none">None</option>
              </select>
            </div>
            {formData.protocol === 'vless' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Flow</label>
                <select
                  value={formData.xray_flow}
                  onChange={(e) => updateFormField('xray_flow', e.target.value)}
                  className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="xtls-rprx-vision">xtls-rprx-vision</option>
                  <option value="">None</option>
                </select>
              </div>
            )}
            {formData.xray_security === 'reality' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SNI</label>
                  <input
                    type="text"
                    value={formData.xray_sni}
                    onChange={(e) => updateFormField('xray_sni', e.target.value)}
                    className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="www.google.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fingerprint</label>
                  <select
                    value={formData.xray_fingerprint}
                    onChange={(e) => updateFormField('xray_fingerprint', e.target.value)}
                    className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="chrome">Chrome</option>
                    <option value="firefox">Firefox</option>
                    <option value="safari">Safari</option>
                    <option value="edge">Edge</option>
                    <option value="random">Random</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Public Key</label>
                  <input
                    type="text"
                    value={formData.xray_public_key}
                    onChange={(e) => updateFormField('xray_public_key', e.target.value)}
                    className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Reality public key"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Short ID</label>
                  <input
                    type="text"
                    value={formData.xray_short_id}
                    onChange={(e) => updateFormField('xray_short_id', e.target.value)}
                    className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="8-digit hex"
                  />
                </div>
              </>
            )}
            {formData.xray_network === 'ws' && (
              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">WebSocket Path</label>
                <input
                  type="text"
                  value={formData.xray_path}
                  onChange={(e) => updateFormField('xray_path', e.target.value)}
                  className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  placeholder="/ws"
                />
              </div>
            )}
            {formData.xray_network === 'grpc' && (
              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">gRPC Service Name</label>
                <input
                  type="text"
                  value={formData.xray_service_name}
                  onChange={(e) => updateFormField('xray_service_name', e.target.value)}
                  className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  placeholder="grpc"
                />
              </div>
            )}
          </div>
        );

      case 'shadowsocks':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <h4 className="col-span-full text-xs font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-2">
              <Radio size={14} />
              Shadowsocks Configuration
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Encryption Method</label>
              <select
                value={formData.xray_encryption}
                onChange={(e) => updateFormField('xray_encryption', e.target.value)}
                className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                <option value="2022-blake3-aes-256-gcm">2022-blake3-aes-256-gcm</option>
                <option value="2022-blake3-chacha20-poly1305">2022-blake3-chacha20-poly1305</option>
                <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305</option>
                <option value="aes-256-gcm">aes-256-gcm</option>
                <option value="aes-128-gcm">aes-128-gcm</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Network</label>
              <select
                value={formData.xray_network}
                onChange={(e) => updateFormField('xray_network', e.target.value)}
                className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Network className="text-blue-500" />
            Inbound Assets
          </h2>
          <p className="text-sm text-gray-500">Multi-protocol gateway configuration (OpenVPN, WireGuard, Cisco, L2TP, Xray)</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          {isAdding ? <X size={18} /> : <Plus size={18} />}
          {isAdding ? 'Cancel' : 'New Inbound'}
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Settings size={16} />
                Provision New Gateway
              </h3>
              <form onSubmit={handleCreate} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inbound Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      placeholder="e.g. EU-OpenVPN-Main"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Server Address (IP or Domain)</label>
                    <input
                      type="text"
                      value={formData.server_address}
                      onChange={(e) => updateFormField('server_address', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      placeholder="e.g. 185.12.34.56 or vpn.example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Protocol</label>
                    <select
                      value={formData.protocol}
                      onChange={(e) => updateFormField('protocol', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none"
                    >
                      <optgroup label="Traditional VPN">
                        {PROTOCOL_CATEGORIES.vpn.protocols.map(p => (
                          <option key={p.value} value={p.value}>{p.label} - {p.description}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Xray Core">
                        {PROTOCOL_CATEGORIES.xray.protocols.map(p => (
                          <option key={p.value} value={p.value}>{p.label} - {p.description}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Listener Port</label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => updateFormField('port', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      placeholder={getDefaultPort(formData.protocol)}
                    />
                  </div>
                </div>

                {/* Protocol-specific configuration */}
                {renderProtocolConfig()}

                {/* Remark */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remark (Optional)</label>
                  <input
                    type="text"
                    value={formData.remark}
                    onChange={(e) => updateFormField('remark', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2"
                  >
                    <Shield size={16} />
                    Initialize Protocol
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden min-h-[300px]">
        {isLoading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4 text-slate-400">
            <Activity className="animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading configurations...</p>
          </div>
        ) : inbounds.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
              <Server size={32} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No protocol gates detected</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Gateway Name</th>
                  <th className="px-6 py-4">Server Address</th>
                  <th className="px-6 py-4">Protocol</th>
                  <th className="px-6 py-4">Port</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Remark</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <AnimatePresence mode="popLayout">
                  {inbounds.map((inbound) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={inbound.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getProtocolColor(inbound.protocol)}`}>
                            {getProtocolIcon(inbound.protocol)}
                          </div>
                          <span className="font-bold text-slate-900 tracking-tight">{inbound.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-600">{inbound.server_address}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${getProtocolColor(inbound.protocol)}`}>
                          {inbound.protocol}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{inbound.port}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                          inbound.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {inbound.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium italic">{inbound.remark || 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Modify Gateway"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(inbound)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Destroy Gateway"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <span>Active Configuration Stack: {inbounds.length} Gates</span>
      </div>
    </motion.div>
  );
}
