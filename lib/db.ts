import mysql from 'mysql2/promise';

const poolConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Log warning if config is missing
if (!poolConfig.host || !poolConfig.user) {
  console.warn('Database environment variables ARE MISSING. API calls will fail.');
}

const pool = mysql.createPool(poolConfig);

export default pool;

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T;
  } catch (err: any) {
    console.error('Database query error:', err.message);
    throw err;
  }
}
