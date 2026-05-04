import { z } from 'zod';

export const UserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable(),
  role: z.enum(['admin', 'user', 'reseller']).default('user'),
  status: z.enum(['active', 'inactive', 'disabled', 'suspended', 'revoked']).default('active'),
  traffic_limit_gb: z.number().min(0).default(10),
  max_connections: z.number().min(0).default(1),
  expires_at: z.string().optional().nullable(),
  inboundIds: z.array(z.number()).optional(),
  cisco_password: z.string().optional().nullable(),
  l2tp_password: z.string().optional().nullable(),
  wg_pubkey: z.string().optional().nullable(),
  xray_uuid: z.string().optional().nullable(),
  port: z.number().optional().nullable(),
  main_protocol: z.string().optional().nullable(),
});

export const ServerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ip_address: z.string().min(1, 'IP Address is required'),
  domain: z.string().optional().nullable(),
  ports: z.string().default('1194, 443'),
  protocol: z.enum(['udp', 'tcp']).default('udp'),
  supports_openvpn: z.boolean().default(true),
  supports_cisco: z.boolean().default(false),
  supports_l2tp: z.boolean().default(false),
  supports_wireguard: z.boolean().default(false),
  supports_xray: z.boolean().default(false),
});

export type UserFormData = z.infer<typeof UserSchema>;
export type ServerFormData = z.infer<typeof ServerSchema>;

export const UpdateUserSchema = UserSchema.partial();
