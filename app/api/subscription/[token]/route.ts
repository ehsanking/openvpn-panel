import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { VpnUser } from '@/lib/db-types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  // Assuming token is the username or a specific token field for now.
  // In a real scenario, this would be validated against the db.
  const users = await query(
    'SELECT * FROM users WHERE username = ? OR xray_uuid = ? LIMIT 1',
    [token, token]
  );

  if (!users || users.length === 0) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  const user = users[0];

  // Logic to return subscription page data, stats, links, etc.
  return NextResponse.json({
    username: user.username,
    status: user.status,
    trafficUsage: user.traffic_total,
    trafficLimit: user.traffic_limit_gb,
    expiryDate: user.expires_at,
    // Add QR code data and relevant links for protocols
  });
}
