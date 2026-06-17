// server/src/routes/wallet.ts — wallet read endpoints (authenticated).
//
// GET /api/wallet/balances    -> [{ asset, free }, ...]
// GET /api/wallet/holdings    -> [{ asset, amount }, ...]
// GET /api/wallet/bonuses     -> [{ asset, amount }, ...]
// GET /api/wallet/transactions?limit=50  -> [ ... ]

import { Router } from 'express';
import { getPool } from '../db.js';
import { asyncHandler, bad } from '../util.js';
import { getUserIdFromRequest } from './auth.js';

export const walletRouter = Router();

walletRouter.get(
  '/balances',
  asyncHandler(async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return bad(res, 401, 'unauthorized');
    const [rows] = await getPool().query<any>(
      'SELECT asset, free FROM wallet_balances WHERE user_id = ? ORDER BY asset',
      [userId],
    );
    res.json(rows);
  }),
);

walletRouter.get(
  '/holdings',
  asyncHandler(async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return bad(res, 401, 'unauthorized');
    const [rows] = await getPool().query<any>(
      'SELECT asset, amount FROM wallet_holdings WHERE user_id = ? ORDER BY asset',
      [userId],
    );
    res.json(rows);
  }),
);

walletRouter.get(
  '/bonuses',
  asyncHandler(async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return bad(res, 401, 'unauthorized');
    const [rows] = await getPool().query<any>(
      'SELECT asset, amount FROM wallet_bonuses WHERE user_id = ? ORDER BY asset',
      [userId],
    );
    res.json(rows);
  }),
);

walletRouter.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return bad(res, 401, 'unauthorized');
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
    const [rows] = await getPool().query<any>(
      `SELECT id, kind, asset, amount, value_usd, note, status, created_at
       FROM transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit],
    );
    res.json(rows);
  }),
);
