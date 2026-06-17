// Small utility helpers shared across route files.

import type { Request, Response, NextFunction } from 'express';

/** Wrap an async handler so thrown errors hit the central error middleware. */
export function asyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
>(
  fn: (req: Request<P, ResBody, ReqBody>, res: Response<ResBody>, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request<P, ResBody, ReqBody>, res: Response<ResBody>, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** JSON error response. */
export function bad(res: Response, status: number, error: string, message?: string) {
  return res.status(status).json({ error, ...(message ? { message } : {}) });
}

/** Random ID with a small prefix, hex. Suitable for opaque keys. */
export function rid(prefix = ''): string {
  const rand = Math.random().toString(16).slice(2, 12);
  const time = Date.now().toString(16);
  return `${prefix}${time}${rand}`;
}

/** Bcrypt-free password hashing (PBKDF2) — keeps the dependency tree small.
 *  Format:  pbkdf2$<iterations>$<saltHex>$<hashHex>
 *  Note:    We use Node's built-in `crypto` so no native add-on is needed. */
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const ITER = 120_000;
const KEYLEN = 32;
const SALT = 16;
const DIGEST = 'sha256';

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT);
  const hash = pbkdf2Sync(plain, salt, ITER, KEYLEN, DIGEST);
  return `pbkdf2$${ITER}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iter = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'hex');
  const expected = Buffer.from(parts[3], 'hex');
  if (!Number.isFinite(iter) || salt.length === 0 || expected.length === 0) return false;
  const got = pbkdf2Sync(plain, salt, iter, expected.length, DIGEST);
  return got.length === expected.length && timingSafeEqual(got, expected);
}
