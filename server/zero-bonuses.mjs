// Zero out all rows in the `wallet_bonuses` table.
// Idempotent: running this multiple times is safe.
//
// Usage:
//   node zero-bonuses.mjs          # set all bonuses to 0 (no confirmation)
//   node zero-bonuses.mjs --check  # only show counts, do NOT modify
//
// Both modes use the same env vars as the rest of the server:
//   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL
//
// IMPORTANT: requires `server/.env` (or env vars in the shell) and a working
// MySQL connection.

import 'dotenv/config';
import mysql from 'mysql2/promise';

const CHECK_ONLY = process.argv.includes('--check');

// Minimal env validation
for (const k of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
  if (!process.env[k]) {
    console.error(`Missing env var: ${k}`);
    process.exit(1);
  }
}

const sslEnabled = String(process.env.DB_SSL ?? '').toLowerCase() === 'true';
const cfg = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...(sslEnabled ? { ssl: process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {} } : {}),
};

let conn;
try {
  conn = await mysql.createConnection(cfg);

  // 1. Show current state.
  const [counts] = await conn.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN amount > 0 THEN 1 ELSE 0 END) AS positive,
            COALESCE(SUM(amount), 0) AS total_amount
       FROM wallet_bonuses`,
  );
  const [top] = await conn.query(
    `SELECT user_id, asset, amount
       FROM wallet_bonuses
      WHERE amount > 0
      ORDER BY amount DESC
      LIMIT 10`,
  );

  console.log('--- BEFORE ---');
  console.log(' rows:        ', counts[0].total);
  console.log(' with > 0:   ', counts[0].positive);
  console.log(' sum(amount):', counts[0].total_amount);
  if (top.length) {
    console.log(' top non-zero rows:');
    for (const r of top) console.log(`   ${r.user_id} ${r.asset} ${r.amount}`);
  } else {
    console.log(' (no non-zero rows)');
  }

  if (CHECK_ONLY) {
    console.log('--- (check only, no changes made) ---');
    process.exit(0);
  }

  // 2. Zero out everything. ON DUPLICATE KEY UPDATE keeps any rows that
  //    already exist (amount=0) without erroring.
  console.log('--- UPDATING ---');
  const [result] = await conn.query(`UPDATE wallet_bonuses SET amount = 0`);
  console.log(` affectedRows: ${result.affectedRows}`);

  // 3. Verify.
  const [after] = await conn.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN amount > 0 THEN 1 ELSE 0 END) AS positive,
            COALESCE(SUM(amount), 0) AS total_amount
       FROM wallet_bonuses`,
  );
  console.log('--- AFTER ---');
  console.log(' rows:        ', after[0].total);
  console.log(' with > 0:   ', after[0].positive);
  console.log(' sum(amount):', after[0].total_amount);

  if (Number(after[0].positive) === 0 && Number(after[0].total_amount) === 0) {
    console.log('SUCCESS - all bonus balances are now 0.');
  } else {
    console.log('WARNING - some non-zero balances remain.');
    process.exit(2);
  }
} catch (e) {
  console.error('FAIL:', e.code || '', e.message);
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
