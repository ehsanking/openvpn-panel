'use client';

import React, { useState, useEffect, use } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Shield, Download, Copy, Check, Wifi, Globe, Key, Lock, 
  Radio, ExternalLink, Clock, Database, Users, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';

interface ConfigItem {
  protocol: string;
  name: string;
  type: string;
  url?: string;
  qrData?: string;
}

interface SubscriptionData {
  user: {
    username: string;
    status: string;
    trafficUsed: number;
    trafficLimit: number;
    trafficLimitBytes: number;
    expiresAt: string;
    maxConnections: number;
  };
  server: {
    address: string;
    ip: string;
  };
  configs: ConfigItem[];
  subscriptionUrl: string;
  protocols: {
    vpn: ConfigItem[];
    xray: ConfigItem[];
  };
}

const getProtocolIcon = (protocol: string) => {
  switch (protocol) {
    case 'openvpn': return <Lock size={20} />;
    case 'wireguard': return <Wifi size={20} />;
    case 'cisco': return <Globe size={20} />;
    case 'l2tp': return <Key size={20} />;
    default: return <Radio size={20} />;
  }
};

const getProtocolColor = (protocol: string) => {
  switch (protocol) {
    case 'openvpn': return 'from-orange-500 to-orange-600';
    case 'wireguard': return 'from-purple-500 to-purple-600';
    case 'cisco': return 'from-blue-500 to-blue-600';
    case 'l2tp': return 'from-green-500 to-green-600';
    case 'vless': return 'from-cyan-500 to-cyan-600';
    case 'vmess': return 'from-pink-500 to-pink-600';
    case 'trojan': return 'from-red-500 to-red-600';
    case 'shadowsocks': return 'from-indigo-500 to-indigo-600';
    default: return 'from-slate-500 to-slate-600';
  }
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function SubscriptionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<ConfigItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/subscription/${token}`)
      .then(res => res.json())
      .then(result => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
          if (result.configs?.length > 0) {
            setSelectedConfig(result.configs[0]);
          }
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const downloadConfig = (config: ConfigItem) => {
    if (config.type === 'file') {
      window.open(`/api/client/download?username=${data?.user.username}&protocol=${config.protocol}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-red-400 mb-2">Invalid Subscription</h1>
          <p className="text-red-300/70">{error || 'This subscription link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  const trafficPercent = data.user.trafficLimit > 0 
    ? Math.min((data.user.trafficUsed / (data.user.trafficLimitBytes)) * 100, 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{data.user.username}</h1>
              <p className="text-white/50 text-sm">Power VPN Subscription</p>
            </div>
            <div className="ml-auto">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                data.user.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {data.user.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Database size={12} />
                <span>TRAFFIC USED</span>
              </div>
              <p className="text-white font-bold">{formatBytes(data.user.trafficUsed || 0)}</p>
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${trafficPercent}%` }}
                />
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Database size={12} />
                <span>TRAFFIC LIMIT</span>
              </div>
              <p className="text-white font-bold">{data.user.trafficLimit || 'Unlimited'} GB</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Clock size={12} />
                <span>EXPIRES</span>
              </div>
              <p className="text-white font-bold">
                {data.user.expiresAt 
                  ? new Date(data.user.expiresAt).toLocaleDateString() 
                  : 'Never'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Users size={12} />
                <span>MAX DEVICES</span>
              </div>
              <p className="text-white font-bold">{data.user.maxConnections}</p>
            </div>
          </div>
        </motion.header>

        {/* Subscription URL */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
        >
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Universal Subscription URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm text-blue-400 font-mono overflow-x-auto">
              {window.location.origin}{data.subscriptionUrl}
            </code>
            <button
              onClick={() => copyToClipboard(`${window.location.origin}${data.subscriptionUrl}`, 'Subscription URL')}
              className="p-3 bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors"
            >
              {copiedUrl === `${window.location.origin}${data.subscriptionUrl}` ? (
                <Check size={20} className="text-white" />
              ) : (
                <Copy size={20} className="text-white" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Protocol Configs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Config List */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Radio size={20} />
              Available Protocols
            </h2>
            <div className="space-y-2">
              <AnimatePresence>
                {data.configs.map((config, index) => (
                  <motion.button
                    key={config.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedConfig(config)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                      selectedConfig?.name === config.name 
                        ? 'bg-white/10 border border-white/20' 
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getProtocolColor(config.protocol)} flex items-center justify-center text-white`}>
                      {getProtocolIcon(config.protocol)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{config.name}</p>
                      <p className="text-white/50 text-xs uppercase tracking-wider">{config.protocol}</p>
                    </div>
                    {config.type === 'file' && (
                      <Download size={16} className="text-white/30" />
                    )}
                    {config.type === 'url' && (
                      <ExternalLink size={16} className="text-white/30" />
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* QR Code & Actions */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            {selectedConfig ? (
              <div className="text-center">
                <h3 className="text-white font-bold mb-2">{selectedConfig.name}</h3>
                <p className="text-white/50 text-sm mb-6 uppercase tracking-wider">{selectedConfig.protocol}</p>
                
                {selectedConfig.qrData && (
                  <div className="bg-white p-4 rounded-2xl inline-block mb-6">
                    <QRCodeSVG value={selectedConfig.qrData} size={200} />
                  </div>
                )}

                <div className="space-y-3">
                  {selectedConfig.url && (
                    <button
                      onClick={() => copyToClipboard(selectedConfig.url!, 'Config URL')}
                      className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                      {copiedUrl === selectedConfig.url ? <Check size={20} /> : <Copy size={20} />}
                      Copy Config Link
                    </button>
                  )}

                  {selectedConfig.type === 'file' && (
                    <button
                      onClick={() => downloadConfig(selectedConfig)}
                      className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                      <Download size={20} />
                      Download Config File
                    </button>
                  )}
                </div>

                {/* Protocol-specific tips */}
                <div className="mt-6 text-left bg-white/5 rounded-xl p-4">
                  <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">How to Connect</p>
                  <p className="text-white/70 text-sm">
                    {selectedConfig.protocol === 'vless' || selectedConfig.protocol === 'vmess' || selectedConfig.protocol === 'trojan' || selectedConfig.protocol === 'shadowsocks' ? (
                      'Scan the QR code or copy the config link into v2rayNG, Shadowrocket, Clash, or similar apps.'
                    ) : selectedConfig.protocol === 'openvpn' ? (
                      'Download the .ovpn file and import it into OpenVPN Connect or Tunnelblick.'
                    ) : selectedConfig.protocol === 'wireguard' ? (
                      'Download the .conf file and import it into the official WireGuard app.'
                    ) : selectedConfig.protocol === 'cisco' ? (
                      'Use Cisco AnyConnect app and enter the server URL to connect.'
                    ) : selectedConfig.protocol === 'l2tp' ? (
                      'Configure L2TP/IPsec VPN in your device settings using the provided credentials.'
                    ) : 'Follow your VPN client instructions to import this configuration.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/50">
                <Radio size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a protocol to view QR code</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Server Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Server</p>
              <p className="text-white font-medium">{data.server.address}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider">IP Address</p>
              <p className="text-white font-mono">{data.server.ip}</p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="text-center text-white/30 text-sm py-4">
          Powered by Power VPN Manager
        </footer>
      </div>
    </div>
  );
}
