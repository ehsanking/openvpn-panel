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

// Idempotent column migrations for already-initialized databases.
// CREATE TABLE IF NOT EXISTS will not add new columns, so we apply these manually.
const COLUMN_MIGRATIONS: Array<{ table: string; column: string; definition: string }> = [
  { table: 'vpn_users', column: 'client_cert', definition: 'TEXT' },
  { table: 'vpn_users', column: 'client_key', definition: 'TEXT' },
  { table: 'vpn_users', column: 'wg_privkey', definition: 'TEXT' },
];

function applyColumnMigrations(database: Database.Database) {
  for (const m of COLUMN_MIGRATIONS) {
    try {
      const existing = database
        .prepare(`PRAGMA table_info(${m.table})`)
        .all() as Array<{ name: string }>;
      if (existing.some(c => c.name === m.column)) continue;
      database.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.definition}`);
    } catch {
      // Table missing or column already added concurrently — safe to ignore.
    }
  }
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

  applyColumnMigrations(db);
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
