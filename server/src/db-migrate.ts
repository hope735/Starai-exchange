// One-off migration: apply schema.sql + seed.sql to the configured DB.
// Idempotent — both SQL files are guarded with IF NOT EXISTS / no-op.
import 'dotenv/config';
import mysql, { type SslOptions } from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Enable TLS for hosted MySQL (TiDB Cloud, PlanetScale, etc.) via DB_SSL=true.
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

try {
  // Step 1: connect without selecting a database, ensure it exists.
  const boot = await mysql.createConnection({
    ...baseCfg,
    ...(ssl ? { ssl } : {}),
    multipleStatements: true,
  });
  await boot.query(
    `CREATE DATABASE IF NOT EXISTS \`${baseCfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  );
  await boot.end();
  console.log(`[1/3] BOOTSTRAP OK - ensured database \`${baseCfg.database}\``);

  // Step 2: connect *to* the DB and run schema + seed.
  const conn = await mysql.createConnection({
    ...baseCfg,
    ...(ssl ? { ssl } : {}),
    multipleStatements: true,
  });

  const schemaPath = join(__dirname, '..', 'schema.sql');
  const seedPath = join(__dirname, '..', 'seed.sql');
  const schema = readFileSync(schemaPath, 'utf8');
  const seed = readFileSync(seedPath, 'utf8');

  await conn.query(schema);
  console.log(`[2/3] SCHEMA OK  - applied ${schemaPath}`);

  await conn.query(seed);
  console.log(`[3/3] SEED   OK  - applied ${seedPath}`);

  // Sanity: list tables so we can prove they exist.
  const [tables] = await conn.query<any>('SHOW TABLES');
  const tableCol = Object.keys(tables[0])[0]; // e.g. "Tables_in_starai_exchange"
  const names = tables.map((r: any) => r[tableCol]);
  console.log('TABLES:', names.join(', '));

  await conn.end();
  process.exit(0);
} catch (err: any) {
  console.error('FAIL', err.code, '-', err.message);
  process.exit(1);
}
