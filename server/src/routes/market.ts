// server/src/routes/market.ts — public market data proxy.
//
// We proxy CoinGecko (or any other source) through the backend so:
//   1. The frontend never has to embed API keys.
//   2. CORS never trips the browser.
//   3. We can rate-limit / cache centrally.
//
// Endpoints are PUBLIC (no auth required) so anyone can browse the market.

import { Router } from 'express';
import { asyncHandler, bad } from '../util.js';

const COINGECKO = process.env.COINGECKO_API ?? 'https://api.coingecko.com/api/v3';
const COINGECKO_KEY = process.env.COINGECKO_API_KEY ?? '';

export const marketRouter = Router();

async function fetchJson(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${COINGECKO}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { accept: 'application/json' };
  if (COINGECKO_KEY) headers['x-cg-demo-api-key'] = COINGECKO_KEY;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Upstream ${res.status} ${res.statusText}`);
  return res.json();
}

marketRouter.get(
  '/coins',
  asyncHandler(async (req, res) => {
    const vs = String(req.query.vs_currency ?? 'usd');
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const perPage = Math.min(Math.max(Number(req.query.per_page ?? 100), 1), 250);
    try {
      const data = await fetchJson('/coins/markets', {
        vs_currency: vs,
        page: String(page),
        per_page: String(perPage),
        sparkline: 'true',
        price_change_percentage: '1h,24h,7d',
        order: 'market_cap_desc',
      });
      res.json(data);
    } catch (e) {
      bad(res, 502, 'upstream_error', (e as Error).message);
    }
  }),
);

marketRouter.get(
  '/global',
  asyncHandler(async (_req, res) => {
    try {
      res.json(await fetchJson('/global'));
    } catch (e) {
      bad(res, 502, 'upstream_error', (e as Error).message);
    }
  }),
);

marketRouter.get(
  '/chart/:coinId',
  asyncHandler(async (req, res) => {
    try {
      const data = await fetchJson(`/coins/${encodeURIComponent(req.params.coinId)}/market_chart`, {
        vs_currency: String(req.query.vs_currency ?? 'usd'),
        days: String(req.query.days ?? '7'),
      });
      res.json(data);
    } catch (e) {
      bad(res, 502, 'upstream_error', (e as Error).message);
    }
  }),
);
