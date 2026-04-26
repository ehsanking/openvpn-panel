import { z } from 'zod';

export const UserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'user', 'reseller']),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  traffic_limit_gb: z.number().min(0).default(0),
  max_connections: z.number().min(0).default(1),
  expires_at: z.string().optional().nullable(),
  inboundIds: z.array(z.number()).optional(),
});

export type UserFormData = z.infer<typeof UserSchema>;

export const UpdateUserSchema = z.object({
  role: z.enum(['admin', 'user', 'reseller']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});
