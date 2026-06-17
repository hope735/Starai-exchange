// db-admin.mjs — interactive / one-shot database manager for the live
// starai_exchange TiDB Cloud instance.
//
// Read the README at the top of each function before running.
// All commands default to READ-ONLY unless you pass --write.

import 'dotenv/config';
import mysql from 'mysql2/promise';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const WRITE = process.argv.includes('--write');

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------
for (const k of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
  if (!process.env[k]) {
    console.error(`Missing env var: ${k}`);
    process.exit(1);
  }
}
const cfg = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...(String(process.env.DB_SSL ?? '').toLowerCase() === 'true'
    ? process.env.DB_SSL_CA ? { ssl: { ca: process.env.DB_SSL_CA } } : { ssl: {} }
    : {}),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'bigint') return v.toString();
  if (Buffer.isBuffer(v)) return `<blob ${v.length}B>`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function printRows(cols, rows) {
  if (!rows.length) {
    console.log('(0 rows)');
    return;
  }
  // tab-separated, padded
  const strs = rows.map((r) => cols.map((c) => fmt(r[c])));
  const widths = cols.map((c, i) =>
    Math.max(c.length, ...strs.map((s) => s[i].length)),
  );
  console.log(cols.map((c, i) => c.padEnd(widths[i])).join('  '));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const s of strs) console.log(s.map((v, i) => v.padEnd(widths[i])).join('  '));
  console.log(`(${rows.length} row${rows.length === 1 ? '' : 's'})`);
}

// ---------------------------------------------------------------------------
// High-level helpers (used by the interactive menu)
// ---------------------------------------------------------------------------
async function listUsers(conn) {
  const [rows] = await conn.query(
    `SELECT id, email, name, kyc_status, two_factor_enabled,
            phrase_confirmed, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 50`,
  );
  printRows(['id', 'email', 'name', 'kyc_status', '2fa', 'phrase', 'created_at'], rows);
}
async function showUser(conn, id) {
  const [users] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!users.length) { console.log('No user with that id.'); return; }
  console.log('--- USER ---');
  printRows(Object.keys(users[0]), users);
  for (const tbl of ['wallet_balances', 'wallet_holdings', 'wallet_bonuses', 'orders', 'transactions', 'notifications', 'kyc_submissions']) {
    const [rows] = await conn.query(
      `SELECT * FROM ${tbl} WHERE ${tbl.startsWith('user') ? 'user_id' : 'user_id'} = ? LIMIT 25`,
      [id],
    );
    if (rows.length) {
      console.log(`--- ${tbl} (showing up to 25) ---`);
      printRows(Object.keys(rows[0]), rows);
    }
  }
}
async function setKyc(conn, id, status) {
  const allowed = ['unverified', 'pending', 'verified', 'rejected'];
  if (!allowed.includes(status)) throw new Error(`status must be one of: ${allowed.join(', ')}`);
  const [r] = await conn.query('UPDATE users SET kyc_status = ? WHERE id = ?', [status, id]);
  console.log(`Updated ${r.affectedRows} row(s).`);
}
async function setBalance(conn, userId, asset, free) {
  const value = Number(free);
  if (!Number.isFinite(value) || value < 0) throw new Error('amount must be a non-negative number');
  const [r] = await conn.query(
    `INSERT INTO wallet_balances (user_id, asset, free)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE free = VALUES(free)`,
    [userId, asset, value],
  );
  console.log(`OK: wallet_balances[${userId}, ${asset}] = ${value} (affectedRows=${r.affectedRows})`);
}
async function setBonus(conn, userId, asset, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error('amount must be a non-negative number');
  const [r] = await conn.query(
    `INSERT INTO wallet_bonuses (user_id, asset, amount)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
    [userId, asset, value],
  );
  console.log(`OK: wallet_bonuses[${userId}, ${asset}] = ${value} (affectedRows=${r.affectedRows})`);
}
async function deleteUser(conn, id) {
  // ON DELETE CASCADE in the schema will remove all their child rows.
  const [r] = await conn.query('DELETE FROM users WHERE id = ?', [id]);
  console.log(`Deleted ${r.affectedRows} row(s) (cascades to all child tables).`);
}
async function rawSql(conn, sql) {
  // Run any SQL — read or write depending on the --write flag and the
  // statement. We do NOT try to parse it; we just relay the result.
  const [result] = await conn.query(sql);
  if (Array.isArray(result)) {
    const cols = result.length ? Object.keys(result[0]) : [];
    printRows(cols, result);
  } else {
    console.log(`affectedRows=${result.affectedRows} insertId=${result.insertId ?? '-'}`);
  }
}

// ---------------------------------------------------------------------------
// Interactive menu
// ---------------------------------------------------------------------------
const MENU = `
Available commands:
  help                                  show this menu
  list                                  list users (most recent 50)
  show <user_id>                        show one user's full state
  kyc <user_id> <status>                set users.kyc_status (write)
  balance <user_id> <asset> <free>      set wallet_balances.free (write)
  bonus <user_id> <asset> <amount>      set wallet_bonuses.amount (write)
  delete <user_id>                      DELETE FROM users WHERE id=? (write, cascades)
  sql <raw SQL...>                      run arbitrary SQL (write if non-SELECT)
  quit                                  exit
`;

async function repl(conn) {
  const rl = createInterface({ input, output });
  console.log('StarAI DB admin — connected to', `${cfg.host}:${cfg.port}/${cfg.database}`);
  if (!WRITE) console.log('READ-ONLY mode. Re-run with --write to allow mutations.');
  console.log(MENU);
  for (;;) {
    let line;
    try {
      line = (await rl.question('db> ')).trim();
    } catch {
      break;
    }
    if (!line) continue;
    const [cmd, ...rest] = line.split(/\s+/);
    try {
      switch (cmd) {
        case 'help': console.log(MENU); break;
        case 'list': await listUsers(conn); break;
        case 'show': await showUser(conn, rest[0]); break;
        case 'kyc':
          if (!WRITE) throw new Error('read-only mode (use --write)');
          await setKyc(conn, rest[0], rest[1]);
          break;
        case 'balance':
          if (!WRITE) throw new Error('read-only mode (use --write)');
          await setBalance(conn, rest[0], rest[1], rest[2]);
          break;
        case 'bonus':
          if (!WRITE) throw new Error('read-only mode (use --write)');
          await setBonus(conn, rest[0], rest[1], rest[2]);
          break;
        case 'delete':
          if (!WRITE) throw new Error('read-only mode (use --write)');
          await deleteUser(conn, rest[0]);
          break;
        case 'sql':
          if (!WRITE && !/^\s*(select|show|describe|desc|explain)\b/i.test(rest.join(' '))) {
            throw new Error('read-only mode (use --write)');
          }
          await rawSql(conn, rest.join(' '));
          break;
        case 'quit':
        case 'exit':
        case 'q':
          rl.close();
          return;
        default:
          console.log(`Unknown command: ${cmd}. Type 'help'.`);
      }
    } catch (e) {
      console.error('ERR:', e.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
let conn;
try {
  conn = await mysql.createConnection(cfg);
  const oneOff = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (oneOff.length === 0) {
    // Interactive
    await repl(conn);
  } else {
    // One-shot:  node db-admin.mjs --write list
    const cmd = oneOff[0];
    switch (cmd) {
      case 'list':    await listUsers(conn); break;
      case 'show':    await showUser(conn, oneOff[1]); break;
      case 'kyc':     if (!WRITE) throw new Error('read-only mode'); await setKyc(conn, oneOff[1], oneOff[2]); break;
      case 'balance': if (!WRITE) throw new Error('read-only mode'); await setBalance(conn, oneOff[1], oneOff[2], oneOff[3]); break;
      case 'bonus':   if (!WRITE) throw new Error('read-only mode'); await setBonus(conn, oneOff[1], oneOff[2], oneOff[3]); break;
      case 'sql':     if (!WRITE && !/^\s*(select|show|describe|desc|explain)\b/i.test(oneOff.slice(1).join(' '))) throw new Error('read-only mode'); await rawSql(conn, oneOff.slice(1).join(' ')); break;
      default:        console.error(`Unknown command: ${cmd}`); process.exit(2);
    }
  }
} catch (e) {
  console.error('FAIL:', e.code || '', e.message);
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
