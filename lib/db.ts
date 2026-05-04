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
  // vpn_inbounds columns added after the original schema shipped.
  { table: 'vpn_inbounds', column: 'server_address', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
  { table: 'vpn_inbounds', column: 'updated_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
  { table: 'vpn_inbounds', column: 'status', definition: "VARCHAR(50) DEFAULT 'active'" },
  // OpenVPN
  { table: 'vpn_inbounds', column: 'ovpn_protocol', definition: "VARCHAR(10) DEFAULT 'udp'" },
  { table: 'vpn_inbounds', column: 'ovpn_cipher', definition: "VARCHAR(50) DEFAULT 'AES-256-GCM'" },
  { table: 'vpn_inbounds', column: 'ovpn_auth', definition: "VARCHAR(50) DEFAULT 'SHA256'" },
  { table: 'vpn_inbounds', column: 'ovpn_dev', definition: "VARCHAR(10) DEFAULT 'tun'" },
  // WireGuard
  { table: 'vpn_inbounds', column: 'wg_private_key', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'wg_public_key', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'wg_address', definition: 'VARCHAR(50)' },
  { table: 'vpn_inbounds', column: 'wg_dns', definition: 'VARCHAR(100)' },
  { table: 'vpn_inbounds', column: 'wg_mtu', definition: 'INT DEFAULT 1420' },
  { table: 'vpn_inbounds', column: 'wg_persistent_keepalive', definition: 'INT DEFAULT 25' },
  // Cisco AnyConnect (ocserv)
  { table: 'vpn_inbounds', column: 'cisco_auth_method', definition: "VARCHAR(50) DEFAULT 'password'" },
  { table: 'vpn_inbounds', column: 'cisco_max_clients', definition: 'INT DEFAULT 100' },
  { table: 'vpn_inbounds', column: 'cisco_dpd', definition: 'INT DEFAULT 90' },
  // L2TP/IPsec
  { table: 'vpn_inbounds', column: 'l2tp_psk', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'l2tp_dns', definition: 'VARCHAR(100)' },
  { table: 'vpn_inbounds', column: 'l2tp_local_ip', definition: 'VARCHAR(50)' },
  { table: 'vpn_inbounds', column: 'l2tp_remote_ip_range', definition: 'VARCHAR(100)' },
  // Xray
  { table: 'vpn_inbounds', column: 'xray_protocol', definition: 'VARCHAR(50)' },
  { table: 'vpn_inbounds', column: 'xray_uuid', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'xray_flow', definition: 'VARCHAR(50)' },
  { table: 'vpn_inbounds', column: 'xray_network', definition: "VARCHAR(50) DEFAULT 'tcp'" },
  { table: 'vpn_inbounds', column: 'xray_security', definition: "VARCHAR(50) DEFAULT 'reality'" },
  { table: 'vpn_inbounds', column: 'xray_sni', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'xray_fingerprint', definition: "VARCHAR(50) DEFAULT 'chrome'" },
  { table: 'vpn_inbounds', column: 'xray_public_key', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'xray_short_id', definition: 'VARCHAR(50)' },
  { table: 'vpn_inbounds', column: 'xray_path', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'xray_service_name', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'xray_encryption', definition: 'VARCHAR(50)' },
  { table: 'vpn_inbounds', column: 'extra_config', definition: 'TEXT' },
  // IKEv2/IPsec
  { table: 'vpn_inbounds', column: 'ike_auth_method', definition: "VARCHAR(20) DEFAULT 'eap'" },
  { table: 'vpn_inbounds', column: 'ike_psk', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'ike_dns', definition: 'VARCHAR(100)' },
  { table: 'vpn_inbounds', column: 'ike_dh_group', definition: "VARCHAR(10) DEFAULT '14'" },
  { table: 'vpn_inbounds', column: 'ike_proposals', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'ike_remote_id', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'ike_local_ip_pool', definition: 'VARCHAR(100)' },
  // PPTP
  { table: 'vpn_inbounds', column: 'pptp_dns', definition: 'VARCHAR(100)' },
  { table: 'vpn_inbounds', column: 'pptp_local_ip', definition: 'VARCHAR(100)' },
  { table: 'vpn_inbounds', column: 'pptp_remote_ip_range', definition: 'VARCHAR(100)' },
  // SSTP
  { table: 'vpn_inbounds', column: 'sstp_dns', definition: 'VARCHAR(100)' },
  { table: 'vpn_inbounds', column: 'sstp_local_ip', definition: 'VARCHAR(100)' },
  { table: 'vpn_inbounds', column: 'sstp_remote_ip_range', definition: 'VARCHAR(100)' },
  { table: 'vpn_inbounds', column: 'sstp_cert_path', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'sstp_key_path', definition: 'VARCHAR(255)' },
  // Hysteria2
  { table: 'vpn_inbounds', column: 'hy2_password', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'hy2_obfs', definition: "VARCHAR(20) DEFAULT 'none'" },
  { table: 'vpn_inbounds', column: 'hy2_obfs_password', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'hy2_sni', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'hy2_alpn', definition: 'VARCHAR(50)' },
  { table: 'vpn_inbounds', column: 'hy2_up_mbps', definition: 'INT DEFAULT 0' },
  { table: 'vpn_inbounds', column: 'hy2_down_mbps', definition: 'INT DEFAULT 0' },
  { table: 'vpn_inbounds', column: 'hy2_insecure', definition: 'BOOLEAN DEFAULT 0' },
  // TUIC v5
  { table: 'vpn_inbounds', column: 'tuic_uuid', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'tuic_password', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'tuic_congestion_control', definition: "VARCHAR(20) DEFAULT 'bbr'" },
  { table: 'vpn_inbounds', column: 'tuic_alpn', definition: 'VARCHAR(50)' },
  { table: 'vpn_inbounds', column: 'tuic_udp_relay_mode', definition: "VARCHAR(20) DEFAULT 'native'" },
  { table: 'vpn_inbounds', column: 'tuic_sni', definition: 'VARCHAR(255)' },
  { table: 'vpn_inbounds', column: 'tuic_disable_sni', definition: 'BOOLEAN DEFAULT 0' },
  { table: 'vpn_inbounds', column: 'tuic_zero_rtt', definition: 'BOOLEAN DEFAULT 0' },
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

function applyIndexMigrations(database: Database.Database) {
  // One inbound per port (across all protocols). If an upgrade hits this on
  // a database that already has duplicates, the index creation will throw —
  // surface that loudly so the operator can deduplicate.
  try {
    database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_vpn_inbounds_port ON vpn_inbounds (port)');
  } catch (err) {
    console.error('[db] failed to create unique index on vpn_inbounds(port):', err);
    throw err;
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
  applyIndexMigrations(db);
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
