'use client';

import React, { useState, useEffect } from 'react';
import { Network, Plus, Server, X, Edit2, Trash2, Shield, Activity, Settings, Globe, Lock, Key, Wifi, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const Required = () => <span className="text-red-500 ml-0.5">*</span>;

// Protocol categories and their options
const PROTOCOL_CATEGORIES = {
  vpn: {
    label: 'Traditional VPN',
    protocols: [
      { value: 'openvpn', label: 'OpenVPN', description: 'UDP/TCP tunneling' },
      { value: 'wireguard', label: 'WireGuard', description: 'Modern, fast VPN' },
      { value: 'ikev2', label: 'IKEv2/IPsec', description: 'Native iOS / macOS / Windows' },
      { value: 'cisco', label: 'Cisco AnyConnect', description: 'Ocserv compatible' },
      { value: 'l2tp', label: 'L2TP/IPsec', description: 'Legacy IPsec tunnel' },
      { value: 'sstp', label: 'SSTP', description: 'Microsoft secure tunnel over TLS' },
      { value: 'pptp', label: 'PPTP (legacy)', description: 'Deprecated — use only for compatibility' },
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
  },
  quic: {
    label: 'Modern QUIC',
    protocols: [
      { value: 'hysteria2', label: 'Hysteria 2', description: 'High-loss / high-RTT QUIC' },
      { value: 'tuic', label: 'TUIC v5', description: 'QUIC for sing-box / Clash.Meta' },
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
  // IKEv2/IPsec
  ike_auth_method: string;
  ike_psk: string;
  ike_dns: string;
  ike_dh_group: string;
  ike_proposals: string;
  ike_remote_id: string;
  ike_local_ip_pool: string;
  // PPTP
  pptp_dns: string;
  pptp_local_ip: string;
  pptp_remote_ip_range: string;
  // SSTP
  sstp_dns: string;
  sstp_local_ip: string;
  sstp_remote_ip_range: string;
  sstp_cert_path: string;
  sstp_key_path: string;
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
  // Hysteria2
  hy2_password: string;
  hy2_obfs: string;
  hy2_obfs_password: string;
  hy2_sni: string;
  hy2_alpn: string;
  hy2_up_mbps: string;
  hy2_down_mbps: string;
  hy2_insecure: boolean;
  // TUIC v5
  tuic_uuid: string;
  tuic_password: string;
  tuic_congestion_control: string;
  tuic_alpn: string;
  tuic_udp_relay_mode: string;
  tuic_sni: string;
  tuic_disable_sni: boolean;
  tuic_zero_rtt: boolean;
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
  // IKEv2 defaults
  ike_auth_method: 'eap',
  ike_psk: '',
  ike_dns: '1.1.1.1',
  ike_dh_group: '14',
  ike_proposals: 'aes256-sha256-modp2048',
  ike_remote_id: '',
  ike_local_ip_pool: '10.20.30.0/24',
  // PPTP defaults
  pptp_dns: '8.8.8.8',
  pptp_local_ip: '192.168.99.1',
  pptp_remote_ip_range: '192.168.99.10-192.168.99.99',
  // SSTP defaults
  sstp_dns: '8.8.8.8',
  sstp_local_ip: '10.50.60.1',
  sstp_remote_ip_range: '10.50.60.10-10.50.60.99',
  sstp_cert_path: '/etc/ssl/certs/sstp.crt',
  sstp_key_path: '/etc/ssl/private/sstp.key',
  // Hysteria2 defaults
  hy2_password: '',
  hy2_obfs: 'none',
  hy2_obfs_password: '',
  hy2_sni: 'www.bing.com',
  hy2_alpn: 'h3',
  hy2_up_mbps: '0',
  hy2_down_mbps: '0',
  hy2_insecure: false,
  // TUIC v5 defaults
  tuic_uuid: '',
  tuic_password: '',
  tuic_congestion_control: 'bbr',
  tuic_alpn: 'h3',
  tuic_udp_relay_mode: 'native',
  tuic_sni: 'www.bing.com',
  tuic_disable_sni: false,
  tuic_zero_rtt: false,
};

const getProtocolIcon = (protocol: string) => {
  switch (protocol) {
    case 'openvpn': return <Lock size={16} />;
    case 'wireguard': return <Wifi size={16} />;
    case 'cisco': return <Globe size={16} />;
    case 'l2tp': return <Key size={16} />;
    case 'ikev2': return <Shield size={16} />;
    case 'pptp':
    case 'sstp': return <Lock size={16} />;
    case 'vless':
    case 'vmess':
    case 'trojan':
    case 'shadowsocks':
      return <Radio size={16} />;
    case 'hysteria2':
    case 'tuic': return <Wifi size={16} />;
    default: return <Shield size={16} />;
  }
};

const getProtocolColor = (protocol: string) => {
  switch (protocol) {
    case 'openvpn': return 'bg-orange-50 text-orange-600';
    case 'wireguard': return 'bg-purple-50 text-purple-600';
    case 'cisco': return 'bg-blue-50 text-blue-600';
    case 'l2tp': return 'bg-green-50 text-green-600';
    case 'ikev2': return 'bg-teal-50 text-teal-600';
    case 'pptp': return 'bg-amber-50 text-amber-600';
    case 'sstp': return 'bg-sky-50 text-sky-600';
    case 'vless': return 'bg-cyan-50 text-cyan-600';
    case 'vmess': return 'bg-pink-50 text-pink-600';
    case 'trojan': return 'bg-red-50 text-red-600';
    case 'shadowsocks': return 'bg-indigo-50 text-indigo-600';
    case 'hysteria2': return 'bg-violet-50 text-violet-600';
    case 'tuic': return 'bg-fuchsia-50 text-fuchsia-600';
    default: return 'bg-slate-50 text-slate-600';
  }
};

const getDefaultPort = (protocol: string) => {
  switch (protocol) {
    case 'openvpn': return '1194';
    case 'wireguard': return '51820';
    case 'cisco': return '443';
    case 'l2tp': return '1701';
    case 'ikev2': return '4500';
    case 'pptp': return '1723';
    case 'sstp': return '443';
    case 'vless':
    case 'vmess':
    case 'trojan': return '443';
    case 'shadowsocks': return '8388';
    case 'hysteria2': return '36712';
    case 'tuic': return '36713';
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
        // Always make sure Xray protocols start with a valid UUID — if the
        // existing one isn't a UUID we replace it.
        if (['vless', 'vmess', 'trojan'].includes(value) && !UUID_RE.test(newData.xray_uuid)) {
          newData.xray_uuid = uuidv4();
        }
        if (value === 'tuic' && !UUID_RE.test(newData.tuic_uuid)) {
          newData.tuic_uuid = uuidv4();
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

  const validateClientSide = (): string | null => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.server_address.trim()) return 'Server address is required';
    const port = parseInt(formData.port, 10);
    if (!port || port < 1 || port > 65535) return 'Port must be between 1 and 65535';

    switch (formData.protocol) {
      case 'wireguard':
        if (!formData.wg_public_key.trim()) return 'WireGuard server public key is required';
        break;
      case 'l2tp':
        if (formData.l2tp_psk.trim().length < 8) return 'L2TP pre-shared key must be at least 8 characters';
        break;
      case 'ikev2':
        if (formData.ike_auth_method === 'psk' && formData.ike_psk.trim().length < 8) {
          return 'IKEv2 pre-shared key must be at least 8 characters when auth method is PSK';
        }
        break;
      case 'vless':
      case 'vmess':
      case 'trojan':
        if (!UUID_RE.test(formData.xray_uuid.trim())) return 'A valid UUID is required for Xray protocols';
        break;
      case 'hysteria2':
        if (!formData.hy2_password.trim()) return 'Hysteria2 password is required';
        if (formData.hy2_obfs === 'salamander' && !formData.hy2_obfs_password.trim()) {
          return 'Hysteria2 obfuscation password is required when salamander is enabled';
        }
        break;
      case 'tuic':
        if (!UUID_RE.test(formData.tuic_uuid.trim())) return 'TUIC requires a valid UUID';
        if (!formData.tuic_password.trim()) return 'TUIC password is required';
        break;
    }
    return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientError = validateClientSide();
    if (clientError) {
      toast.error(clientError);
      return;
    }

    // Strip empty optional fields so the discriminated-union Zod schema on the
    // server doesn't complain about, say, an empty `xray_uuid` on an OpenVPN
    // inbound.
    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      protocol: formData.protocol,
      port: parseInt(formData.port, 10),
      server_address: formData.server_address.trim(),
      remark: formData.remark.trim() || undefined,
    };
    const include = (key: string, value: any) => {
      if (value === '' || value === null || value === undefined) return;
      payload[key] = value;
    };
    switch (formData.protocol) {
      case 'openvpn':
        include('ovpn_protocol', formData.ovpn_protocol);
        include('ovpn_cipher', formData.ovpn_cipher);
        include('ovpn_auth', formData.ovpn_auth);
        include('ovpn_dev', formData.ovpn_dev);
        break;
      case 'wireguard':
        include('wg_public_key', formData.wg_public_key.trim());
        include('wg_private_key', formData.wg_private_key.trim());
        include('wg_address', formData.wg_address);
        include('wg_dns', formData.wg_dns);
        include('wg_mtu', parseInt(formData.wg_mtu, 10) || 1420);
        break;
      case 'cisco':
        include('cisco_auth_method', formData.cisco_auth_method);
        include('cisco_max_clients', parseInt(formData.cisco_max_clients, 10) || 100);
        include('cisco_dpd', parseInt(formData.cisco_dpd, 10) || 90);
        break;
      case 'l2tp':
        include('l2tp_psk', formData.l2tp_psk.trim());
        include('l2tp_dns', formData.l2tp_dns);
        include('l2tp_local_ip', formData.l2tp_local_ip);
        include('l2tp_remote_ip_range', formData.l2tp_remote_ip_range);
        break;
      case 'vless':
      case 'vmess':
      case 'trojan':
        include('xray_uuid', formData.xray_uuid.trim());
        if (formData.protocol === 'vless') include('xray_flow', formData.xray_flow);
        include('xray_network', formData.xray_network);
        include('xray_security', formData.xray_security);
        include('xray_sni', formData.xray_sni);
        include('xray_fingerprint', formData.xray_fingerprint);
        include('xray_public_key', formData.xray_public_key);
        include('xray_short_id', formData.xray_short_id);
        if (formData.xray_network === 'ws') include('xray_path', formData.xray_path);
        if (formData.xray_network === 'grpc') include('xray_service_name', formData.xray_service_name);
        break;
      case 'shadowsocks':
        include('xray_encryption', formData.xray_encryption);
        include('xray_network', formData.xray_network);
        break;

      case 'ikev2':
        include('ike_auth_method', formData.ike_auth_method);
        if (formData.ike_auth_method === 'psk') include('ike_psk', formData.ike_psk.trim());
        include('ike_dns', formData.ike_dns);
        include('ike_dh_group', formData.ike_dh_group);
        include('ike_proposals', formData.ike_proposals);
        include('ike_remote_id', formData.ike_remote_id);
        include('ike_local_ip_pool', formData.ike_local_ip_pool);
        break;

      case 'pptp':
        include('pptp_dns', formData.pptp_dns);
        include('pptp_local_ip', formData.pptp_local_ip);
        include('pptp_remote_ip_range', formData.pptp_remote_ip_range);
        break;

      case 'sstp':
        include('sstp_dns', formData.sstp_dns);
        include('sstp_local_ip', formData.sstp_local_ip);
        include('sstp_remote_ip_range', formData.sstp_remote_ip_range);
        include('sstp_cert_path', formData.sstp_cert_path);
        include('sstp_key_path', formData.sstp_key_path);
        break;

      case 'hysteria2':
        include('hy2_password', formData.hy2_password.trim());
        include('hy2_obfs', formData.hy2_obfs);
        if (formData.hy2_obfs === 'salamander') include('hy2_obfs_password', formData.hy2_obfs_password.trim());
        include('hy2_sni', formData.hy2_sni);
        include('hy2_alpn', formData.hy2_alpn);
        include('hy2_up_mbps', parseInt(formData.hy2_up_mbps, 10) || 0);
        include('hy2_down_mbps', parseInt(formData.hy2_down_mbps, 10) || 0);
        include('hy2_insecure', formData.hy2_insecure);
        break;

      case 'tuic':
        include('tuic_uuid', formData.tuic_uuid.trim());
        include('tuic_password', formData.tuic_password.trim());
        include('tuic_congestion_control', formData.tuic_congestion_control);
        include('tuic_alpn', formData.tuic_alpn);
        include('tuic_udp_relay_mode', formData.tuic_udp_relay_mode);
        include('tuic_sni', formData.tuic_sni);
        include('tuic_disable_sni', formData.tuic_disable_sni);
        include('tuic_zero_rtt', formData.tuic_zero_rtt);
        break;
    }

    try {
      const res = await fetch('/api/inbounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = body?.error?.code;
        const msg = body?.error?.message || 'Failed to create inbound';
        if (code === 'PORT_IN_USE') {
          toast.error(msg);
        } else if (code === 'VALIDATION_ERROR' && body?.error?.details?.fieldErrors) {
          const fields = Object.entries(body.error.details.fieldErrors as Record<string, string[]>)
            .map(([k, v]) => `${k}: ${v.join(', ')}`)
            .join(' · ');
          toast.error(fields || msg);
        } else {
          toast.error(msg);
        }
        return;
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Server Public Key<Required /></label>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pre-Shared Key (PSK)<Required /> <span className="text-slate-300 font-normal lowercase">min 8 chars</span></label>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">UUID<Required /></label>
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

      case 'ikev2':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-teal-50/50 rounded-xl border border-teal-100">
            <h4 className="col-span-full text-xs font-bold text-teal-700 uppercase tracking-widest flex items-center gap-2">
              <Shield size={14} />
              IKEv2 / IPsec Configuration (strongSwan)
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Auth Method<Required /></label>
              <select
                value={formData.ike_auth_method}
                onChange={(e) => updateFormField('ike_auth_method', e.target.value)}
                className="w-full bg-white border border-teal-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="eap">EAP (username + password)</option>
                <option value="psk">Pre-shared key</option>
                <option value="cert">Certificate</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DH Group</label>
              <select
                value={formData.ike_dh_group}
                onChange={(e) => updateFormField('ike_dh_group', e.target.value)}
                className="w-full bg-white border border-teal-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="14">14 — modp2048 (default)</option>
                <option value="15">15 — modp3072</option>
                <option value="16">16 — modp4096</option>
                <option value="19">19 — ecp256</option>
                <option value="20">20 — ecp384</option>
                <option value="21">21 — ecp521</option>
              </select>
            </div>
            {formData.ike_auth_method === 'psk' && (
              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pre-shared Key<Required /> <span className="text-slate-300 font-normal lowercase">min 8 chars</span></label>
                <input
                  type="text"
                  value={formData.ike_psk}
                  onChange={(e) => updateFormField('ike_psk', e.target.value)}
                  className="w-full bg-white border border-teal-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="Strong random secret"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DNS Server</label>
              <input
                type="text"
                value={formData.ike_dns}
                onChange={(e) => updateFormField('ike_dns', e.target.value)}
                className="w-full bg-white border border-teal-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="1.1.1.1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Local IP Pool</label>
              <input
                type="text"
                value={formData.ike_local_ip_pool}
                onChange={(e) => updateFormField('ike_local_ip_pool', e.target.value)}
                className="w-full bg-white border border-teal-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="10.20.30.0/24"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cipher Proposals</label>
              <input
                type="text"
                value={formData.ike_proposals}
                onChange={(e) => updateFormField('ike_proposals', e.target.value)}
                className="w-full bg-white border border-teal-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="aes256-sha256-modp2048"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remote ID (optional)</label>
              <input
                type="text"
                value={formData.ike_remote_id}
                onChange={(e) => updateFormField('ike_remote_id', e.target.value)}
                className="w-full bg-white border border-teal-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="vpn.example.com"
              />
            </div>
          </div>
        );

      case 'pptp':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-xl border border-amber-200">
            <div className="col-span-full p-3 rounded-lg bg-amber-100/60 border border-amber-200 text-[11px] font-semibold text-amber-900 leading-relaxed">
              ⚠️ PPTP is deprecated — MS-CHAPv2 / MPPE has known weaknesses.
              Prefer IKEv2 or WireGuard whenever possible. Provided here only
              for compatibility with very old clients.
            </div>
            <h4 className="col-span-full text-xs font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2">
              <Lock size={14} />
              PPTP Configuration
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DNS Server</label>
              <input
                type="text"
                value={formData.pptp_dns}
                onChange={(e) => updateFormField('pptp_dns', e.target.value)}
                className="w-full bg-white border border-amber-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="8.8.8.8"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Local IP</label>
              <input
                type="text"
                value={formData.pptp_local_ip}
                onChange={(e) => updateFormField('pptp_local_ip', e.target.value)}
                className="w-full bg-white border border-amber-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="192.168.99.1"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remote IP Range</label>
              <input
                type="text"
                value={formData.pptp_remote_ip_range}
                onChange={(e) => updateFormField('pptp_remote_ip_range', e.target.value)}
                className="w-full bg-white border border-amber-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="192.168.99.10-192.168.99.99"
              />
            </div>
          </div>
        );

      case 'sstp':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-sky-50/50 rounded-xl border border-sky-100">
            <h4 className="col-span-full text-xs font-bold text-sky-700 uppercase tracking-widest flex items-center gap-2">
              <Lock size={14} />
              SSTP Configuration (TLS over TCP)
            </h4>
            <div className="col-span-full p-3 rounded-lg bg-sky-100/60 border border-sky-200 text-[11px] text-sky-900 leading-relaxed">
              SSTP needs a publicly-trusted TLS certificate on the panel
              host. The cert / key paths below are stored as a hint for the
              operator — the panel does not read or write those files.
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DNS Server</label>
              <input
                type="text"
                value={formData.sstp_dns}
                onChange={(e) => updateFormField('sstp_dns', e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="8.8.8.8"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Local IP</label>
              <input
                type="text"
                value={formData.sstp_local_ip}
                onChange={(e) => updateFormField('sstp_local_ip', e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="10.50.60.1"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remote IP Range</label>
              <input
                type="text"
                value={formData.sstp_remote_ip_range}
                onChange={(e) => updateFormField('sstp_remote_ip_range', e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="10.50.60.10-10.50.60.99"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Certificate Path</label>
              <input
                type="text"
                value={formData.sstp_cert_path}
                onChange={(e) => updateFormField('sstp_cert_path', e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="/etc/ssl/certs/sstp.crt"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Private Key Path</label>
              <input
                type="text"
                value={formData.sstp_key_path}
                onChange={(e) => updateFormField('sstp_key_path', e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="/etc/ssl/private/sstp.key"
              />
            </div>
          </div>
        );

      case 'hysteria2':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-violet-50/50 rounded-xl border border-violet-100">
            <h4 className="col-span-full text-xs font-bold text-violet-700 uppercase tracking-widest flex items-center gap-2">
              <Wifi size={14} />
              Hysteria 2 Configuration
            </h4>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password<Required /></label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.hy2_password}
                  onChange={(e) => updateFormField('hy2_password', e.target.value)}
                  className="flex-1 bg-white border border-violet-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  placeholder="Strong shared secret"
                />
                <button
                  type="button"
                  onClick={() => updateFormField('hy2_password', uuidv4().replace(/-/g, '').slice(0, 24))}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-all"
                >
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Obfuscation</label>
              <select
                value={formData.hy2_obfs}
                onChange={(e) => updateFormField('hy2_obfs', e.target.value)}
                className="w-full bg-white border border-violet-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
              >
                <option value="none">None (raw QUIC)</option>
                <option value="salamander">Salamander (recommended)</option>
              </select>
            </div>
            {formData.hy2_obfs === 'salamander' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Obfuscation Password<Required /></label>
                <input
                  type="text"
                  value={formData.hy2_obfs_password}
                  onChange={(e) => updateFormField('hy2_obfs_password', e.target.value)}
                  className="w-full bg-white border border-violet-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  placeholder="Salamander shared secret"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SNI</label>
              <input
                type="text"
                value={formData.hy2_sni}
                onChange={(e) => updateFormField('hy2_sni', e.target.value)}
                className="w-full bg-white border border-violet-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                placeholder="www.bing.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ALPN</label>
              <input
                type="text"
                value={formData.hy2_alpn}
                onChange={(e) => updateFormField('hy2_alpn', e.target.value)}
                className="w-full bg-white border border-violet-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                placeholder="h3"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Up bandwidth (Mbps)</label>
              <input
                type="number"
                value={formData.hy2_up_mbps}
                onChange={(e) => updateFormField('hy2_up_mbps', e.target.value)}
                className="w-full bg-white border border-violet-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                placeholder="0 = unlimited"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Down bandwidth (Mbps)</label>
              <input
                type="number"
                value={formData.hy2_down_mbps}
                onChange={(e) => updateFormField('hy2_down_mbps', e.target.value)}
                className="w-full bg-white border border-violet-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                placeholder="0 = unlimited"
              />
            </div>
            <label className="col-span-full flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hy2_insecure}
                onChange={(e) => setFormData(prev => ({ ...prev, hy2_insecure: e.target.checked }))}
                className="rounded text-violet-600 focus:ring-violet-500"
              />
              Allow self-signed TLS certificate (insecure — testing only)
            </label>
          </div>
        );

      case 'tuic':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-fuchsia-50/50 rounded-xl border border-fuchsia-100">
            <h4 className="col-span-full text-xs font-bold text-fuchsia-700 uppercase tracking-widest flex items-center gap-2">
              <Wifi size={14} />
              TUIC v5 Configuration
            </h4>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">UUID<Required /></label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.tuic_uuid}
                  onChange={(e) => updateFormField('tuic_uuid', e.target.value)}
                  className="flex-1 bg-white border border-fuchsia-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                  placeholder="Per-inbound UUID"
                />
                <button
                  type="button"
                  onClick={() => updateFormField('tuic_uuid', uuidv4())}
                  className="px-4 py-2 bg-fuchsia-600 text-white rounded-xl text-xs font-bold hover:bg-fuchsia-700 transition-all"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="col-span-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password<Required /></label>
              <input
                type="text"
                value={formData.tuic_password}
                onChange={(e) => updateFormField('tuic_password', e.target.value)}
                className="w-full bg-white border border-fuchsia-100 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                placeholder="Strong shared secret"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Congestion Control</label>
              <select
                value={formData.tuic_congestion_control}
                onChange={(e) => updateFormField('tuic_congestion_control', e.target.value)}
                className="w-full bg-white border border-fuchsia-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
              >
                <option value="bbr">BBR (recommended)</option>
                <option value="cubic">Cubic</option>
                <option value="new_reno">New Reno</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">UDP Relay Mode</label>
              <select
                value={formData.tuic_udp_relay_mode}
                onChange={(e) => updateFormField('tuic_udp_relay_mode', e.target.value)}
                className="w-full bg-white border border-fuchsia-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
              >
                <option value="native">Native</option>
                <option value="quic">QUIC</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SNI</label>
              <input
                type="text"
                value={formData.tuic_sni}
                onChange={(e) => updateFormField('tuic_sni', e.target.value)}
                className="w-full bg-white border border-fuchsia-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                placeholder="www.bing.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ALPN</label>
              <input
                type="text"
                value={formData.tuic_alpn}
                onChange={(e) => updateFormField('tuic_alpn', e.target.value)}
                className="w-full bg-white border border-fuchsia-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                placeholder="h3"
              />
            </div>
            <label className="col-span-full flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tuic_zero_rtt}
                onChange={(e) => setFormData(prev => ({ ...prev, tuic_zero_rtt: e.target.checked }))}
                className="rounded text-fuchsia-600 focus:ring-fuchsia-500"
              />
              Enable 0-RTT handshake (faster but slightly weaker forward secrecy)
            </label>
            <label className="col-span-full flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tuic_disable_sni}
                onChange={(e) => setFormData(prev => ({ ...prev, tuic_disable_sni: e.target.checked }))}
                className="rounded text-fuchsia-600 focus:ring-fuchsia-500"
              />
              Disable SNI (skip TLS server name)
            </label>
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
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inbound Name<Required /></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      placeholder="e.g. EU-OpenVPN-Main"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Server Address (IP or Domain)<Required /></label>
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
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Listener Port<Required /></label>
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
