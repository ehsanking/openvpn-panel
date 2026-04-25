import mysql from 'mysql2/promise';

// Mock Database Storage
class MockPool {
  private users: any[] = [
    { id: 1, username: 'admin', role: 'admin', created_at: new Date().toISOString() },
    { id: 2, username: 'reseller1', role: 'reseller', created_at: new Date().toISOString() },
    { id: 3, username: 'user1', role: 'user', created_at: new Date().toISOString() },
  ];

  async execute(sql: string, params: any[] = []): Promise<[any, any]> {
    console.log('Mock DB Execute:', sql, params);
    
    if (sql.includes('SELECT') && sql.includes('vpn_users')) {
      if (sql.includes('COUNT')) {
        return [[{ total: this.users.length }], null];
      }
      return [this.users, null];
    }
    
    if (sql.includes('INSERT INTO vpn_users')) {
      const newUser = {
        id: this.users.length + 1,
        username: params[0],
        password: params[1],
        role: params[2],
        created_at: new Date().toISOString()
      };
      this.users.push(newUser);
      return [{ insertId: newUser.id }, null];
    }

    return [[], null];
  }

  async getConnection() {
    return {
      execute: this.execute.bind(this),
      release: () => {},
    };
  }
}

let activePool: any;

const isMockInitial = process.env.MYSQL_HOST === undefined && process.env.NODE_ENV !== 'production';

if (isMockInitial) {
  console.warn('⚠️ MYSQL_HOST not set. Falling back to Mock Database for development.');
  activePool = new MockPool();
} else {
  activePool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'vpn_panel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

// Wrapper to allow "hot-swapping" the pool
const poolProxy = {
  execute: async (sql: string, params: any[] = []) => {
    return activePool.execute(sql, params);
  },
  getConnection: async () => {
    return activePool.getConnection();
  },
  query: async (sql: string, params: any[] = []) => {
    if (activePool.query) return activePool.query(sql, params);
    return activePool.execute(sql, params);
  }
};

// Named helper used by API routes: returns rows directly (the first element
// of the [rows, fields] tuple from mysql2). Routes call e.g.
// `const rows = await query('SELECT ...');`
export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const result: any = await activePool.execute(sql, params);
  return Array.isArray(result) ? (result[0] as T) : (result as T);
}

export async function validateConnection() {
  if (isMockInitial) return;
  
  try {
    const connection = await activePool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.info('Tip: Ensure MYSQL_HOST, MYSQL_USER, and MYSQL_PASSWORD are set in your environment.');
    
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Switching to Mock Database for this session.');
      activePool = new MockPool();
    }
  }
}

// Ensure connection is validated on startup
if (process.env.NODE_ENV !== 'test') {
  validateConnection();
}

export default poolProxy;
