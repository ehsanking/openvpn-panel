import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: null | Database.Database = null;

// Simple lock to serialize write operations
let writeLock: Promise<void> = Promise.resolve();

async function acquireLock() {
  let release: () => void;
  const lock = new Promise<void>(resolve => {
    release = resolve;
  });
  const previousLock = writeLock;
  writeLock = lock;
  await previousLock;
  return release!;
}

export async function validateConnection() {
  if (db) return;
  
  const dbPath = path.join(process.cwd(), 'panel.sqlite');
  db = new Database(dbPath);

  // Initialize schema if not already initialized
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }
}

// Ensure connection is validated on startup
if (process.env.NODE_ENV !== 'test') {
  validateConnection();
}

/**
 * Normalizes object values that might not be compatible with better-sqlite3 
 * or handles edge cases for params.
 */
function normalizeParams(params: any[]) {
  if (!params) return [];
  return params.map(p => {
    if (p instanceof Date) return p.toISOString();
    return p;
  });
}

// Wrapper to mimic mysql2 query API structure (returning [rows, fields])
const poolProxy = {
  execute: async (sql: string, params: any[] = []) => {
    if (!db) await validateConnection();
    const normalized = normalizeParams(params);
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    
    if (isSelect) {
      const stmt = db!.prepare(sql);
      const rows = stmt.all(normalized);
      return [rows, null];
    } else {
      const release = await acquireLock();
      try {
        const stmt = db!.prepare(sql);
        const result = stmt.run(normalized);
        // better-sqlite3 returns { changes, lastInsertRowid }
        return [{ insertId: Number(result.lastInsertRowid), affectedRows: result.changes }, null];
      } finally {
        release();
      }
    }
  },
  getConnection: async () => {
    return {
      execute: poolProxy.execute,
      query: poolProxy.execute,
      release: () => {},
      beginTransaction: async () => { if (db) db.exec('BEGIN'); },
      commit: async () => { if (db) db.exec('COMMIT'); },
      rollback: async () => { if (db) db.exec('ROLLBACK'); }
    };
  },
  query: async (sql: string, params: any[] = []) => {
    if (!db) await validateConnection();
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    const normalized = normalizeParams(params);

    if (isSelect) {
      const stmt = db!.prepare(sql);
      const rows = stmt.all(normalized);
      return [rows, null];
    } else {
      const release = await acquireLock();
      try {
        const stmt = db!.prepare(sql);
        const result = stmt.run(normalized);
        return [{ insertId: Number(result.lastInsertRowid), affectedRows: result.changes }, null];
      } finally {
        release();
      }
    }
  }
};

export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  const [rows] = await poolProxy.query(sql, params);
  return (rows as any[]) || [];
};

export const queryOne = async (sql: string, params: any[] = []) => {
  const [rows]: any = await poolProxy.query(sql, params);
  return rows[0] || null;
};

export default poolProxy;
