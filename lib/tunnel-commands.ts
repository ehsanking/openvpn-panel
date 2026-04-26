/**
 * DPI-Resistant Tunnel Command Generator
 * 
 * Modern protocols for bypassing Iranian firewall:
 * 
 * 1. Hysteria2 - QUIC-based, newest and fastest, very hard to detect
 * 2. Xray Reality - Looks exactly like real HTTPS to major sites (google, microsoft)
 * 3. WSS - WebSocket over TLS, classic reliable option
 * 4. gRPC - HTTP/2 based, mimics Google services
 */

export interface TunnelNode {
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
  status: string;
}

export interface MainServerConfig {
  ip: string;
  port: number;
}

/**
 * Generate the command to run on the MAIN server (where panel is installed)
 */
export function generateMainServerCommand(
  mainServer: MainServerConfig,
  tunnelType: string,
  tunnelSecret: string,
  localForwardPort: number
): string {
  switch (tunnelType) {
    case 'hysteria2':
      return `# =============================================
# Hysteria2 Server Setup (Main Server)
# Most DPI-resistant option - QUIC based
# =============================================

# Install Hysteria2
curl -fsSL https://get.hy2.sh/ | bash

# Create config
cat > /etc/hysteria/config.yaml << 'EOF'
listen: :${mainServer.port}

tls:
  cert: /etc/hysteria/server.crt
  key: /etc/hysteria/server.key

auth:
  type: password
  password: ${tunnelSecret}

masquerade:
  type: proxy
  proxy:
    url: https://www.google.com
    rewriteHost: true
EOF

# Generate self-signed cert (or use real cert)
openssl req -x509 -nodes -newkey ec:<(openssl ecparam -name prime256v1) \\
  -keyout /etc/hysteria/server.key -out /etc/hysteria/server.crt \\
  -subj "/CN=www.google.com" -days 36500

# Start service
systemctl enable hysteria-server
systemctl start hysteria-server`;

    case 'reality':
      return `# =============================================
# Xray Reality Server Setup (Main Server)
# Looks like real HTTPS - Nearly undetectable
# =============================================

# Install Xray
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

# Generate Reality keys
xray x25519

# Create config (replace PRIVATE_KEY with generated key)
cat > /usr/local/etc/xray/config.json << 'EOF'
{
  "inbounds": [{
    "listen": "0.0.0.0",
    "port": ${mainServer.port},
    "protocol": "vless",
    "settings": {
      "clients": [{"id": "${tunnelSecret}", "flow": "xtls-rprx-vision"}],
      "decryption": "none"
    },
    "streamSettings": {
      "network": "tcp",
      "security": "reality",
      "realitySettings": {
        "show": false,
        "dest": "www.google.com:443",
        "xver": 0,
        "serverNames": ["www.google.com", "google.com"],
        "privateKey": "YOUR_PRIVATE_KEY_HERE",
        "shortIds": ["", "0123456789abcdef"]
      }
    }
  }],
  "outbounds": [{"protocol": "freedom"}]
}
EOF

# Start service
systemctl enable xray
systemctl start xray`;

    case 'wss':
      return `# =============================================
# WebSocket TLS Tunnel (Main Server)
# Looks like normal HTTPS traffic
# =============================================

# Install Gost
curl -L https://github.com/ginuerzh/gost/releases/download/v2.11.5/gost-linux-amd64-2.11.5.gz | gunzip > /usr/local/bin/gost
chmod +x /usr/local/bin/gost

# Create systemd service
cat > /etc/systemd/system/gost-tunnel.service << 'EOF'
[Unit]
Description=Gost WSS Tunnel Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/gost -L "relay+wss://:${mainServer.port}?path=/ws&cert=/etc/ssl/certs/server.crt&key=/etc/ssl/private/server.key"
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Generate self-signed cert (or use real cert from Let's Encrypt)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
  -keyout /etc/ssl/private/server.key \\
  -out /etc/ssl/certs/server.crt \\
  -subj "/CN=www.google.com"

systemctl daemon-reload
systemctl enable gost-tunnel
systemctl start gost-tunnel`;

    case 'grpc':
      return `# =============================================
# gRPC Tunnel (Main Server)
# Mimics Google services traffic
# =============================================

# Install Gost
curl -L https://github.com/ginuerzh/gost/releases/download/v2.11.5/gost-linux-amd64-2.11.5.gz | gunzip > /usr/local/bin/gost
chmod +x /usr/local/bin/gost

# Create systemd service
cat > /etc/systemd/system/gost-grpc.service << 'EOF'
[Unit]
Description=Gost gRPC Tunnel Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/gost -L "relay+grpc://:${mainServer.port}"
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gost-grpc
systemctl start gost-grpc`;

    default:
      return `# Unknown tunnel type: ${tunnelType}`;
  }
}

/**
 * Generate the command to run on the REMOTE node server
 */
export function generateRemoteNodeCommand(
  node: TunnelNode,
  mainServerIp: string,
  mainServerListenPort: number
): string {
  const header = `# =============================================
# Tunnel Setup for: ${node.name} (${node.location})
# Type: ${node.tunnel_type.toUpperCase()}
# =============================================

`;

  switch (node.tunnel_type) {
    case 'hysteria2':
      return header + `# Install Hysteria2
curl -fsSL https://get.hy2.sh/ | bash

# Create client config
cat > /etc/hysteria/config.yaml << 'EOF'
server: ${mainServerIp}:${mainServerListenPort}

auth: ${node.tunnel_secret}

tls:
  sni: ${node.sni_host}
  insecure: true

socks5:
  listen: 127.0.0.1:${node.local_forward_port}

http:
  listen: 127.0.0.1:${node.local_forward_port + 1}
EOF

# Create systemd service
cat > /etc/systemd/system/hysteria-client.service << 'EOF'
[Unit]
Description=Hysteria2 Client Tunnel
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/hysteria client -c /etc/hysteria/config.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hysteria-client
systemctl start hysteria-client

# Check status
systemctl status hysteria-client`;

    case 'reality':
      return header + `# Install Xray
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

# Create client config
cat > /usr/local/etc/xray/config.json << 'EOF'
{
  "inbounds": [{
    "listen": "127.0.0.1",
    "port": ${node.local_forward_port},
    "protocol": "socks",
    "settings": {"udp": true}
  }],
  "outbounds": [{
    "protocol": "vless",
    "settings": {
      "vnext": [{
        "address": "${mainServerIp}",
        "port": ${mainServerListenPort},
        "users": [{"id": "${node.tunnel_secret}", "flow": "xtls-rprx-vision", "encryption": "none"}]
      }]
    },
    "streamSettings": {
      "network": "tcp",
      "security": "reality",
      "realitySettings": {
        "show": false,
        "fingerprint": "chrome",
        "serverName": "${node.sni_host}",
        "publicKey": "YOUR_PUBLIC_KEY_HERE",
        "shortId": ""
      }
    }
  }]
}
EOF

systemctl enable xray
systemctl start xray

# Check status
systemctl status xray`;

    case 'wss':
      return header + `# Install Gost
curl -L https://github.com/ginuerzh/gost/releases/download/v2.11.5/gost-linux-amd64-2.11.5.gz | gunzip > /usr/local/bin/gost
chmod +x /usr/local/bin/gost

# Create systemd service
cat > /etc/systemd/system/gost-tunnel.service << 'EOF'
[Unit]
Description=Gost WSS Tunnel Client
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/gost -L "tcp://:${node.local_forward_port}" -F "relay+wss://${mainServerIp}:${mainServerListenPort}?path=/ws&serverName=${node.sni_host}"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gost-tunnel
systemctl start gost-tunnel

# Check status
systemctl status gost-tunnel`;

    case 'grpc':
      return header + `# Install Gost
curl -L https://github.com/ginuerzh/gost/releases/download/v2.11.5/gost-linux-amd64-2.11.5.gz | gunzip > /usr/local/bin/gost
chmod +x /usr/local/bin/gost

# Create systemd service
cat > /etc/systemd/system/gost-grpc.service << 'EOF'
[Unit]
Description=Gost gRPC Tunnel Client
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/gost -L "tcp://:${node.local_forward_port}" -F "relay+grpc://${mainServerIp}:${mainServerListenPort}"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gost-grpc
systemctl start gost-grpc

# Check status
systemctl status gost-grpc`;

    default:
      return `# Unknown tunnel type: ${node.tunnel_type}`;
  }
}

/**
 * Get human-readable description of tunnel type
 */
export function getTunnelTypeDescription(type: string): string {
  switch (type) {
    case 'hysteria2':
      return 'Hysteria2 (QUIC) - Newest protocol, extremely fast and hard to detect. Best for Iranian firewall.';
    case 'reality':
      return 'Xray Reality - TLS fingerprint looks exactly like visiting google.com. Nearly impossible to detect.';
    case 'wss':
      return 'WebSocket over TLS - Looks like normal HTTPS traffic. Good fallback option.';
    case 'grpc':
      return 'gRPC over HTTP/2 - Mimics Google services traffic pattern.';
    default:
      return 'Unknown tunnel type';
  }
}

/**
 * Get recommended tunnel type
 */
export function getRecommendedTunnelType(): 'hysteria2' | 'reality' | 'wss' | 'grpc' {
  // Hysteria2 is currently the most effective for Iran
  return 'hysteria2';
}
