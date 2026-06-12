// Lightweight CoinGecko client with caching, retries and a graceful offline
// fallback that keeps the UI usable even when the public API is rate limited.

import type { Coin } from '../types';
import {
  FALLBACK_COINS,
  FALLBACK_GLOBAL,
  FALLBACK_ID_MAP,
  buildFallbackChart,
} from './fallbackData';

const API_BASE = (import.meta.env.VITE_COINGECKO_API as string) ||
  'https://api.coingecko.com/api/v3';
const API_KEY = (import.meta.env.VITE_COINGECKO_API_KEY as string) || '';

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 30_000; // 30s
const REQUEST_TIMEOUT_MS = 6000;

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: signal ?? controller.signal });
    if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

async function cached<T>(key: string, loader: () => Promise<T>, fallback: () => T): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;
  try {
    const value = await loader();
    cache.set(key, { value, expires: now + CACHE_TTL });
    return value;
  } catch {
    const value = fallback();
    cache.set(key, { value, expires: now + CACHE_TTL });
    return value;
  }
}

export interface MarketsQuery {
  vsCurrency?: string;
  page?: number;
  perPage?: number;
  ids?: string[];
  signal?: AbortSignal;
}

export async function getMarkets(q: MarketsQuery = {}): Promise<Coin[]> {
  const {
    vsCurrency = 'usd',
    page = 1,
    perPage = 100,
    ids,
    signal,
  } = q;
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order: 'market_cap_desc',
    per_page: String(perPage),
    page: String(page),
    sparkline: 'true',
    price_change_percentage: '1h,24h,7d',
  });
  if (ids && ids.length) params.set('ids', ids.join(','));
  const url = `${API_BASE}/coins/markets?${params.toString()}`;
  return cached<Coin[]>(
    `markets:${url}`,
    () => fetchJson<Coin[]>(url, signal),
    () => FALLBACK_COINS,
  );
}

export async function getGlobalData(): Promise<{
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
  active_cryptocurrencies: number;
  markets: number;
  market_cap_change_percentage_24h_usd: number;
}> {
  const url = `${API_BASE}/global`;
  return cached(
    'global',
    () => fetchJson<{ data: any }>(url).then((r) => r.data),
    () => FALLBACK_GLOBAL,
  );
}

export interface ChartQuery {
  id: string;
  vsCurrency?: string;
  days?: number;
  signal?: AbortSignal;
}

export async function getMarketChart(q: ChartQuery): Promise<{
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}> {
  const { id, vsCurrency = 'usd', days = 7, signal } = q;
  const url = `${API_BASE}/coins/${id}/market_chart?vs_currency=${vsCurrency}&days=${days}`;
  return cached(
    `chart:${url}`,
    () => fetchJson<any>(url, signal),
    () => {
      // Derive a symbol from the id we passed in (we pass symbols from the UI).
      const sym = id.toUpperCase();
      const fallback = buildFallbackChart(FALLBACK_ID_MAP[sym] ? sym : sym, days);
      return {
        prices: fallback.prices,
        market_caps: fallback.prices.map(([t, p]) => [t, p * 1_000_000] as [number, number]),
        total_volumes: fallback.prices.map(([t]) => [t, 1_000_000] as [number, number]),
      };
    },
  );
}

export function getFallbackIdForSymbol(symbol: string): string {
  return FALLBACK_ID_MAP[symbol.toUpperCase()] ?? symbol.toLowerCase();
}
