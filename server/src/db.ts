// MySQL connection pool + schema bootstrap. The pool is created lazily
// after we ensure the database exists; we use mysql2/promise so we can
// `await` queries from Express handlers.

import 'dotenv/config';
import mysql, {
  type Pool,
  type RowDataPacket,
  type ResultSetHeader,
  type SslOptions,
} from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// SSL is required for hosted providers like TiDB Cloud / PlanetScale / AWS RDS.
// Set DB_SSL=true in .env to enable. For TiDB Cloud the default `{}` is fine
// (uses the system's CA bundle via mysql2's bundled CA).
const sslEnabled = String(process.env.DB_SSL ?? '').toLowerCase() === 'true';
const ssl: SslOptions | undefined = sslEnabled
  ? process.env.DB_SSL_CA
    ? { ca: process.env.DB_SSL_CA }
    : {}
  : undefined;

const baseCfg = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'Abc123@123',
  database: process.env.DB_NAME ?? 'test_db',
};

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      ...baseCfg,
      ...(ssl ? { ssl } : {}),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
    });
  }
  return pool;
}

export type DbRow = RowDataPacket;
export type DbResult = ResultSetHeader;

/**
 * Connect to MySQL *without* a default database, create the database
 * if it doesn't exist, then run the schema + seed scripts. Idempotent:
 * safe to call on every server start.
 */
export async function bootstrapDatabase(): Promise<void> {
  // Step 1: connect without a default database
  const bootstrap = await mysql.createConnection({
    ...baseCfg,
    ...(ssl ? { ssl } : {}),
    multipleStatements: true,
  });
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${baseCfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    );
  } finally {
    await bootstrap.end();
  }

  // Step 2: now connect to that database and run schema
  const conn = await getPool().getConnection();
  try {
    const schema = readFileSync(join(__dirname, '..', 'schema.sql'), 'utf8');
    const seed = readFileSync(join(__dirname, '..', 'seed.sql'), 'utf8');
    // mysql2 allows multipleStatements when set on the pool; the
    // statements run as one query, separated by `;`.
    await conn.query(schema);
    await conn.query(seed);
  } finally {
    conn.release();
  }
}
