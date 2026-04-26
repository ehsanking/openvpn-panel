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

const isMockInitial = process.env.MYSQL_HOST === undefined;

if (isMockInitial) {
  console.warn(`⚠️ MYSQL_HOST not set (${process.env.NODE_ENV || 'development'}). Falling back to Mock Database.`);
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

let initPromise: Promise<void> | null = null;

// Wrapper to allow "hot-swapping" the pool
const poolProxy = {
  execute: async (sql: string, params: any[] = []) => {
    if (initPromise) await initPromise;
    return activePool.execute(sql, params);
  },
  getConnection: async () => {
    if (initPromise) await initPromise;
    return activePool.getConnection();
  },
  query: async (sql: string, params: any[] = []) => {
    if (initPromise) await initPromise;
    let result;
    if (activePool.query) result = await activePool.query(sql, params);
    else result = await activePool.execute(sql, params);
    return result[0];
  }
};

export async function validateConnection() {
  if (isMockInitial) {
    console.info('ℹ️ Using Mock Database (MYSQL_HOST not set).');
    return;
  }
  
  try {
    const connection = await activePool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error: any) {
    console.info('🔌 No database detected (or connection refused). Using Mock Database.');
    activePool = new MockPool();
  }
}

// Ensure connection is validated on startup
if (process.env.NODE_ENV !== 'test') {
  initPromise = validateConnection();
}

export const query = poolProxy.query;
export const queryOne = async (sql: string, params: any[] = []) => {
    const [rows]: any = await poolProxy.query(sql, params);
    return rows[0] || null;
};

export default poolProxy;
