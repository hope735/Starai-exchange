// server/src/routes/auth.ts — auth endpoints.
//
// POST /api/auth/register   { email, password, name } -> { id, email, name, token }
// POST /api/auth/login      { email, password }      -> { id, email, name, token }
// POST /api/auth/verify-phrase  { userId, phrase }   -> { ok: true }
// GET  /api/auth/me         (Authorization: Bearer <token>) -> user
//
// Sessions: we issue an opaque bearer token (stored in the `users` row would
// be a future enhancement; for now the token = signed base64(payload) using
// the JWT-shaped pattern but with our own crypto so we don't need a JWT lib).

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db.js';
import { asyncHandler, bad, hashPassword, rid, verifyPassword } from '../util.js';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// In a real deployment, JWT_SECRET would come from env. For now we derive a
// deterministic secret from DB_PASSWORD if JWT_SECRET is unset, so things
// just work out of the box on Render.
const SECRET = process.env.JWT_SECRET ?? process.env.DB_PASSWORD ?? 'dev-secret-change-me';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

type TokenPayload = { sub: string; iat: number; exp: number };

function signToken(userId: string): string {
  const payload: TokenPayload = { sub: userId, iat: Date.now(), exp: Date.now() + TOKEN_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

/** Pulls the userId from Authorization: Bearer <token>. Returns null if invalid. */
export function getUserIdFromRequest(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const payload = verifyToken(auth.slice(7).trim());
  return payload?.sub ?? null;
}

const RegisterBody = z.object({
  email: z.string().email().max(190),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
  recovery_phrase: z.array(z.string()).length(12).optional(),
});
const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const VerifyPhraseBody = z.object({
  userId: z.string().max(64),
  phrase: z.array(z.string()).length(12),
});

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parse = RegisterBody.safeParse(req.body);
    if (!parse.success) return bad(res, 400, 'invalid_body', parse.error.message);
    const { email, password, name, recovery_phrase } = parse.data;

    const pool = getPool();
    // Ensure email not already used.
    const [existing] = await pool.query<any>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return bad(res, 409, 'email_in_use');

    const id = rid('u_');
    const password_hash = hashPassword(password);
    const phrase = recovery_phrase ?? Array.from({ length: 12 }, () => randomBytes(4).toString('hex'));
    const created_at = Date.now();

    await pool.query(
      `INSERT INTO users
        (id, email, name, password_hash, kyc_status, recovery_phrase, phrase_confirmed, two_factor_enabled, created_at)
       VALUES (?, ?, ?, ?, 'unverified', CAST(? AS JSON), 0, 0, ?)`,
      [id, email, name, password_hash, JSON.stringify(phrase), created_at],
    );

    // Bootstrap a USDT wallet row so the UI has something to render.
    await pool.query(
      `INSERT INTO wallet_balances (user_id, asset, free) VALUES (?, 'USDT', 0)
       ON DUPLICATE KEY UPDATE free = free`,
      [id],
    );

    const token = signToken(id);
    res.json({ id, email, name, token });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parse = LoginBody.safeParse(req.body);
    if (!parse.success) return bad(res, 400, 'invalid_body');
    const { email, password } = parse.data;

    const [rows] = await getPool().query<any>(
      'SELECT id, email, name, password_hash FROM users WHERE email = ?',
      [email],
    );
    if (!rows.length) return bad(res, 401, 'invalid_credentials');
    const user = rows[0];
    if (!verifyPassword(password, user.password_hash)) {
      return bad(res, 401, 'invalid_credentials');
    }
    const token = signToken(user.id);
    res.json({ id: user.id, email: user.email, name: user.name, token });
  }),
);

authRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return bad(res, 401, 'unauthorized');
    const [rows] = await getPool().query<any>(
      `SELECT id, email, name, kyc_status, two_factor_enabled, phrase_confirmed, created_at
       FROM users WHERE id = ?`,
      [userId],
    );
    if (!rows.length) return bad(res, 404, 'not_found');
    res.json(rows[0]);
  }),
);

authRouter.post(
  '/verify-phrase',
  asyncHandler(async (req, res) => {
    const parse = VerifyPhraseBody.safeParse(req.body);
    if (!parse.success) return bad(res, 400, 'invalid_body');
    const { userId, phrase } = parse.data;
    const [rows] = await getPool().query<any>(
      'SELECT recovery_phrase FROM users WHERE id = ?',
      [userId],
    );
    if (!rows.length) return bad(res, 404, 'not_found');
    const stored = rows[0].recovery_phrase;
    if (!Array.isArray(stored) || stored.length !== 12) return bad(res, 400, 'phrase_not_set');
    const ok = stored.every((w: string, i: number) => String(w).trim().toLowerCase() === phrase[i].trim().toLowerCase());
    if (!ok) return bad(res, 401, 'phrase_mismatch');
    await getPool().query('UPDATE users SET phrase_confirmed = 1 WHERE id = ?', [userId]);
    res.json({ ok: true });
  }),
);
