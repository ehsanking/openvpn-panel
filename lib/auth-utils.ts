import { TextEncoder } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';

const SECRET_FILE = path.join(process.cwd(), '.jwt_secret');

export async function getJwtSecret(): Promise<Uint8Array> {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
        return new TextEncoder().encode(process.env.JWT_SECRET);
    }

    if (fs.existsSync(SECRET_FILE)) {
        const secret = fs.readFileSync(SECRET_FILE, 'utf8');
        return new TextEncoder().encode(secret);
    }

    const newSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, newSecret);
    return new TextEncoder().encode(newSecret);
}

export interface AdminPayload {
    role: 'admin';
    [key: string]: unknown;
}

/**
 * Resolve the admin JWT from either:
 * - the `vpn_session_jwt` cookie (used by the web panel), or
 * - an `Authorization: Bearer <jwt>` header (used by the dedicated app).
 *
 * Returns the verified payload on success, or `null` if absent / invalid.
 * Does not throw — callers decide how to respond.
 */
export async function verifyAdminToken(req: Request): Promise<AdminPayload | null> {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let token: string | null = null;

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
    } else {
        const store = await cookies();
        token = store.get('vpn_session_jwt')?.value || null;
    }

    if (!token) return null;

    try {
        const secret = await getJwtSecret();
        const { payload } = await jose.jwtVerify(token, secret);
        if (payload.role !== 'admin') return null;
        return payload as AdminPayload;
    } catch {
        return null;
    }
}

/**
 * Guard for admin-only API routes. Returns either:
 * - `{ ok: true, payload }` when the request is authenticated, or
 * - `{ ok: false, response }` carrying a 401 NextResponse the caller should return.
 *
 * Usage:
 *     const auth = await requireAdmin(req);
 *     if (!auth.ok) return auth.response;
 */
export async function requireAdmin(req: Request):
    Promise<{ ok: true; payload: AdminPayload } | { ok: false; response: NextResponse }> {
    const payload = await verifyAdminToken(req);
    if (!payload) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' } },
                { status: 401 }
            )
        };
    }
    return { ok: true, payload };
}
