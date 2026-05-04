export type UserRole = 'admin' | 'reseller' | 'user';
export type UserStatus = 'active' | 'inactive' | 'disabled' | 'suspended' | 'revoked';
export type ServerStatus = 'online' | 'offline';
export type Protocol = 'udp' | 'tcp';

export interface VpnUser {
  id: number;
  username: string;
  password_hash: string | null;
  role: UserRole;
  parent_id: number | null;
  status: UserStatus;
  created_at: Date;
  expires_at: Date | null;
  last_connected: Date | null;
  traffic_total: number;
  traffic_limit_gb: number;
  max_connections: number;
  cisco_password: string | null;
  l2tp_password: string | null;
  wg_pubkey: string | null;
  wg_ip: string | null;
  xray_uuid: string | null;
  xray_flow: string | null;
  port: number | null;
  main_protocol: string | null;
  custom_config: any; // Could be a more specific type if known
  profile_data: string | null;
  password_changed_at?: Date;
}

export interface VpnServer {
  id: number;
  name: string;
  ip_address: string;
  domain: string | null;
  ports: number[];
  protocol: Protocol;
  supports_openvpn: boolean;
  supports_cisco: boolean;
  supports_l2tp: boolean;
  supports_wireguard: boolean;
  supports_xray: boolean;
  load_score: number;
  status: ServerStatus;
  is_active: boolean;
  bandwidth_ingress: number;
  bandwidth_egress: number;
  latency_ms: number;
  created_at: Date;
}

export interface Setting {
  key: string;
  value: string;
}

export interface ResellerLimit {
  id: number;
  reseller_id: number;
  max_users: number;
  allocated_traffic_gb: number;
}
