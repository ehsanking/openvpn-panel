import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Check database connectivity
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();

    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy'
      }
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json({ 
      status: 'unhealthy', 
      error: error.message 
    }, { status: 503 });
  }
}
