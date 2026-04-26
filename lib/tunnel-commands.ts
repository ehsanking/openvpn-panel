/**
 * DPI-Resistant Tunnel Command Generator
 * 
 * Generates commands for establishing secure tunnels between nodes
 * Using Gost (Go Simple Tunnel) for maximum DPI bypass capability
 * 
 * Tunnel Types:
 * - WSS: WebSocket over TLS (looks like HTTPS traffic)
 * - gRPC: HTTP/2 based (looks like Google services)
 * - QUIC: UDP-based encrypted protocol
 * - H2: HTTP/2 tunnel
 */

export interface TunnelNode {
  id: number;
  name: string;
  location: string;
  country_code?: string;
  flag_emoji?: string;
  remote_ip: string;
  tunnel_port: number;
  tunnel_type: 'wss' | 'grpc' | 'quic' | 'h2';
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
 * This creates the listener that remote nodes will connect to
 */
export function generateMainServerCommand(
  mainServer: MainServerConfig,
  tunnelType: string,
  tunnelSecret: string,
  localForwardPort: number
): string {
  const authHeader = Buffer.from(`admin:${tunnelSecret}`).toString('base64');
  
  switch (tunnelType) {
    case 'wss':
      return `# Install Gost on Main Server
curl -L https://github.com/ginuerzh/gost/releases/download/v2.11.5/gost-linux-amd64-2.11.5.gz -o gost.gz && gunzip gost.gz && chmod +x gost && mv gost /usr/local/bin/

# Run Tunnel Listener (WSS - Looks like HTTPS)
gost -L "relay+wss://:${mainServer.port}?auth=${authHeader}&path=/ws&cert=/etc/ssl/certs/server.crt&key=/etc/ssl/private/server.key"`;

    case 'grpc':
      return `# Install Gost on Main Server
curl -L https://github.com/ginuerzh/gost/releases/download/v2.11.5/gost-linux-amd64-2.11.5.gz -o gost.gz && gunzip gost.gz && chmod +x gost && mv gost /usr/local/bin/

# Run Tunnel Listener (gRPC - Looks like Google services)
gost -L "relay+grpc://:${mainServer.port}?auth=${authHeader}"`;

    case 'quic':
      return `# Install Gost on Main Server
curl -L https://github.com/ginuerzh/gost/releases/download/v2.11.5/gost-linux-amd64-2.11.5.gz -o gost.gz && gunzip gost.gz && chmod +x gost && mv gost /usr/local/bin/

# Run Tunnel Listener (QUIC - UDP encrypted)
gost -L "relay+quic://:${mainServer.port}?auth=${authHeader}"`;

    case 'h2':
      return `# Install Gost on Main Server
curl -L https://github.com/ginuerzh/gost/releases/download/v2.11.5/gost-linux-amd64-2.11.5.gz -o gost.gz && gunzip gost.gz && chmod +x gost && mv gost /usr/local/bin/

# Run Tunnel Listener (HTTP/2)
gost -L "relay+h2://:${mainServer.port}?auth=${authHeader}"`;

    default:
      return `# Unknown tunnel type: ${tunnelType}`;
  }
}

/**
 * Generate the command to run on the REMOTE node server
 * This connects back to the main server and creates the tunnel
 */
export function generateRemoteNodeCommand(
  node: TunnelNode,
  mainServerIp: string,
  mainServerListenPort: number
): string {
  const authHeader = Buffer.from(`admin:${node.tunnel_secret}`).toString('base64');
  
  const installCmd = `# ============================================
# Tunnel Setup for: ${node.name} (${node.location})
# ============================================

# Step 1: Install Gost
curl -L https://github.com/ginuerzh/gost/releases/download/v2.11.5/gost-linux-amd64-2.11.5.gz -o gost.gz
gunzip gost.gz
chmod +x gost
mv gost /usr/local/bin/

`;

  let tunnelCmd = '';
  
  switch (node.tunnel_type) {
    case 'wss':
      tunnelCmd = `# Step 2: Start Tunnel (WSS - DPI Resistant)
# This will forward local port ${node.local_forward_port} through the tunnel
gost -L "tcp://:${node.local_forward_port}" -F "relay+wss://${mainServerIp}:${mainServerListenPort}?auth=${authHeader}&path=/ws&serverName=${node.sni_host}"`;
      break;

    case 'grpc':
      tunnelCmd = `# Step 2: Start Tunnel (gRPC - Looks like Google traffic)
gost -L "tcp://:${node.local_forward_port}" -F "relay+grpc://${mainServerIp}:${mainServerListenPort}?auth=${authHeader}"`;
      break;

    case 'quic':
      tunnelCmd = `# Step 2: Start Tunnel (QUIC - UDP based)
gost -L "tcp://:${node.local_forward_port}" -F "relay+quic://${mainServerIp}:${mainServerListenPort}?auth=${authHeader}"`;
      break;

    case 'h2':
      tunnelCmd = `# Step 2: Start Tunnel (HTTP/2)
gost -L "tcp://:${node.local_forward_port}" -F "relay+h2://${mainServerIp}:${mainServerListenPort}?auth=${authHeader}"`;
      break;
  }

  const systemdService = `

# ============================================
# Optional: Create Systemd Service for Auto-Start
# ============================================
cat > /etc/systemd/system/gost-tunnel.service << 'EOF'
[Unit]
Description=Gost Tunnel to Main Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/gost -L "tcp://:${node.local_forward_port}" -F "relay+${node.tunnel_type}://${mainServerIp}:${mainServerListenPort}?auth=${authHeader}${node.tunnel_type === 'wss' ? `&path=/ws&serverName=${node.sni_host}` : ''}"
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

  return installCmd + tunnelCmd + systemdService;
}

/**
 * Get human-readable description of tunnel type
 */
export function getTunnelTypeDescription(type: string): string {
  switch (type) {
    case 'wss':
      return 'WebSocket over TLS - Appears as normal HTTPS traffic, best for bypassing DPI';
    case 'grpc':
      return 'gRPC over HTTP/2 - Mimics Google services traffic';
    case 'quic':
      return 'QUIC Protocol - Fast UDP-based encrypted tunnel';
    case 'h2':
      return 'HTTP/2 Tunnel - Standard HTTP/2 based connection';
    default:
      return 'Unknown tunnel type';
  }
}

/**
 * Get recommended tunnel type based on conditions
 */
export function getRecommendedTunnelType(): 'wss' | 'grpc' | 'quic' | 'h2' {
  // WSS is generally the most DPI-resistant for Iranian firewall
  return 'wss';
}
