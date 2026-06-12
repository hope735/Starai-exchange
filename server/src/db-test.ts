// One-off connectivity + bootstrap test. Mirrors what
// bootstrapDatabase() does in db.ts: creates the DB if missing,
// then verifies we can connect, select it, and run a query.
import 'dotenv/config';
import mysql, { type SslOptions } from 'mysql2/promise';

// Enable TLS for hosted MySQL (TiDB Cloud, PlanetScale, etc.) via DB_SSL=true.
const sslEnabled = String(process.env.DB_SSL ?? '').toLowerCase() === 'true';
const ssl: SslOptions | undefined = sslEnabled
  ? (process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {})
  : undefined;

const cfg = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'Abc123@123',
  database: process.env.DB_NAME ?? 'test_db',
  ...(ssl ? { ssl } : {}),
};

try {
  // Step 1: connect without a default DB and ensure the DB exists.
  const boot = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  });
  await boot.query(
    `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  );
  await boot.end();
  console.log('BOOTSTRAP OK - ensured database', cfg.database);

  // Step 2: connect to that DB and run a sanity query.
  const conn = await mysql.createConnection(cfg);
  const [rows] = await conn.query<any>(
    'SELECT VERSION() AS version, DATABASE() AS db, USER() AS user, CURRENT_USER() AS currentUser',
  );
  console.log('CONNECT OK -', rows[0]);
  await conn.end();
  process.exit(0);
} catch (err: any) {
  console.error('FAIL', err.code, '-', err.message);
  process.exit(1);
}
