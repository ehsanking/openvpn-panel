import { z } from 'zod';
import { NextResponse } from 'next/server';

// ──────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────

export const adminLoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const clientLoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const userCreateSchema = z.object({
  username: z
    .string()
    .min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد')
    .max(50, 'نام کاربری نباید بیشتر از ۵۰ کاراکتر باشد')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد، _ و - باشد'
    ),
  password: z.string().min(6).max(100).optional(),
  protocol: z.enum(['udp', 'tcp']).optional(),
  expires_at: z.string().nullable().optional(),
  traffic_limit_gb: z.number().int().min(0).max(100_000).optional(),
  role: z.enum(['user', 'admin', 'reseller']).optional(),
  cisco_password: z.string().max(100).nullable().optional(),
  l2tp_password: z.string().max(100).nullable().optional(),
  max_connections: z.number().int().min(1).max(100).optional(),
  xray_uuid: z.string().uuid().optional(),
  xray_flow: z.string().max(50).optional(),
  port: z.number().int().min(1).max(65535).nullable().optional(),
  main_protocol: z
    .enum(['openvpn', 'cisco', 'wireguard', 'l2tp', 'xray'])
    .optional(),
});

export const bulkUserCreateSchema = z.union([
  userCreateSchema,
  z.array(userCreateSchema),
]);

export const userPatchSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['active', 'inactive', 'suspended']),
});

export const serverCreateSchema = z.object({
  name: z.string().min(1).max(100),
  ip_address: z
    .string()
    .regex(
      /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/,
      'آدرس IP معتبر نیست'
    ),
  domain: z.string().max(253).optional(),
  ports: z.array(z.number().int().min(1).max(65535)).max(20).optional(),
  protocol: z.enum(['udp', 'tcp']).optional(),
});

const ALLOWED_SETTING_KEYS = new Set([
  'panelName',
  'defaultCipher',
  'defaultDns',
  'jwtSecret',
  'caCert',
  'caKey',
  'tlsAuthKey',
]);

export const settingsUpdateSchema = z
  .record(z.string(), z.string().max(65535))
  .refine(
    (obj) => Object.keys(obj).every((k) => ALLOWED_SETTING_KEYS.has(k)),
    { message: 'کلید تنظیمات نامعتبر است' }
  );

// ──────────────────────────────────────────────
// Helper: parse + return 400 on failure
// ──────────────────────────────────────────────

export function parseBody<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map((e: any) => e.message).join(', ');
    return {
      success: false,
      response: NextResponse.json({ error: messages }, { status: 400 }),
    };
  }
  return { success: true, data: result.data };
}
