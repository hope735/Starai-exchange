// Offline fallback market data. Used when the public CoinGecko API is
// unreachable or rate-limited so the UI always has something to render.

import type { Coin } from '../types';

function sparkline(base: number, drift: number, n = 168): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i += 1) {
    v = v * (1 + (Math.sin(i * 0.21) * 0.004 + (i / n - 0.5) * drift));
    out.push(+v.toFixed(6));
  }
  return out;
}

export const FALLBACK_COINS: Coin[] = [
  {
    id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: '',
    current_price: 67234.12, market_cap: 1324000000000, market_cap_rank: 1,
    total_volume: 24800000000, high_24h: 68100, low_24h: 66800,
    price_change_24h: 540.21, price_change_percentage_24h: 0.81,
    circulating_supply: 19720000,
    sparkline_in_7d: { price: sparkline(66000, 0.03) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: '',
    current_price: 3521.44, market_cap: 423000000000, market_cap_rank: 2,
    total_volume: 14200000000, high_24h: 3570, low_24h: 3480,
    price_change_24h: -12.1, price_change_percentage_24h: -0.34,
    circulating_supply: 120280000,
    sparkline_in_7d: { price: sparkline(3500, 0.025) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'tether', symbol: 'usdt', name: 'Tether', image: '',
    current_price: 1.0, market_cap: 118000000000, market_cap_rank: 3,
    total_volume: 48000000000, high_24h: 1.001, low_24h: 0.999,
    price_change_24h: 0.0, price_change_percentage_24h: 0.01,
    circulating_supply: 118000000000,
    sparkline_in_7d: { price: sparkline(1, 0.001) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'binancecoin', symbol: 'bnb', name: 'BNB', image: '',
    current_price: 612.55, market_cap: 90000000000, market_cap_rank: 4,
    total_volume: 1800000000, high_24h: 620, low_24h: 605,
    price_change_24h: 4.21, price_change_percentage_24h: 0.69,
    circulating_supply: 147000000,
    sparkline_in_7d: { price: sparkline(610, 0.02) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'solana', symbol: 'sol', name: 'Solana', image: '',
    current_price: 168.9, market_cap: 78000000000, market_cap_rank: 5,
    total_volume: 3200000000, high_24h: 174, low_24h: 164,
    price_change_24h: 2.34, price_change_percentage_24h: 1.41,
    circulating_supply: 462000000,
    sparkline_in_7d: { price: sparkline(165, 0.05) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ripple', symbol: 'xrp', name: 'XRP', image: '',
    current_price: 0.5234, market_cap: 29000000000, market_cap_rank: 6,
    total_volume: 1100000000, high_24h: 0.54, low_24h: 0.515,
    price_change_24h: -0.011, price_change_percentage_24h: -2.06,
    circulating_supply: 55400000000,
    sparkline_in_7d: { price: sparkline(0.52, 0.04) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'usd-coin', symbol: 'usdc', name: 'USD Coin', image: '',
    current_price: 1.0, market_cap: 34000000000, market_cap_rank: 7,
    total_volume: 6400000000, high_24h: 1.001, low_24h: 0.999,
    price_change_24h: 0.0, price_change_percentage_24h: 0.0,
    circulating_supply: 34000000000,
    sparkline_in_7d: { price: sparkline(1, 0.001) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'cardano', symbol: 'ada', name: 'Cardano', image: '',
    current_price: 0.4521, market_cap: 16000000000, market_cap_rank: 8,
    total_volume: 380000000, high_24h: 0.47, low_24h: 0.44,
    price_change_24h: -0.008, price_change_percentage_24h: -1.74,
    circulating_supply: 35400000000,
    sparkline_in_7d: { price: sparkline(0.45, 0.04) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', image: '',
    current_price: 0.1623, market_cap: 23000000000, market_cap_rank: 9,
    total_volume: 950000000, high_24h: 0.17, low_24h: 0.16,
    price_change_24h: 0.003, price_change_percentage_24h: 1.88,
    circulating_supply: 142000000000,
    sparkline_in_7d: { price: sparkline(0.16, 0.05) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'avalanche', symbol: 'avax', name: 'Avalanche', image: '',
    current_price: 36.41, market_cap: 14000000000, market_cap_rank: 10,
    total_volume: 420000000, high_24h: 37.5, low_24h: 35.2,
    price_change_24h: 0.55, price_change_percentage_24h: 1.53,
    circulating_supply: 384000000,
    sparkline_in_7d: { price: sparkline(36, 0.04) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'polygon', symbol: 'matic', name: 'Polygon', image: '',
    current_price: 0.7321, market_cap: 7200000000, market_cap_rank: 11,
    total_volume: 240000000, high_24h: 0.76, low_24h: 0.71,
    price_change_24h: -0.012, price_change_percentage_24h: -1.61,
    circulating_supply: 9800000000,
    sparkline_in_7d: { price: sparkline(0.73, 0.04) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'chainlink', symbol: 'link', name: 'Chainlink', image: '',
    current_price: 14.85, market_cap: 8700000000, market_cap_rank: 12,
    total_volume: 320000000, high_24h: 15.2, low_24h: 14.5,
    price_change_24h: 0.21, price_change_percentage_24h: 1.43,
    circulating_supply: 586000000,
    sparkline_in_7d: { price: sparkline(14.7, 0.04) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'litecoin', symbol: 'ltc', name: 'Litecoin', image: '',
    current_price: 82.31, market_cap: 6200000000, market_cap_rank: 13,
    total_volume: 280000000, high_24h: 84.1, low_24h: 81.0,
    price_change_24h: -1.12, price_change_percentage_24h: -1.34,
    circulating_supply: 75000000,
    sparkline_in_7d: { price: sparkline(82, 0.03) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'uniswap', symbol: 'uni', name: 'Uniswap', image: '',
    current_price: 7.62, market_cap: 4600000000, market_cap_rank: 14,
    total_volume: 150000000, high_24h: 7.85, low_24h: 7.4,
    price_change_24h: 0.08, price_change_percentage_24h: 1.06,
    circulating_supply: 600000000,
    sparkline_in_7d: { price: sparkline(7.6, 0.04) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'stellar', symbol: 'xlm', name: 'Stellar', image: '',
    current_price: 0.1102, market_cap: 3200000000, market_cap_rank: 15,
    total_volume: 85000000, high_24h: 0.115, low_24h: 0.108,
    price_change_24h: -0.002, price_change_percentage_24h: -1.78,
    circulating_supply: 29000000000,
    sparkline_in_7d: { price: sparkline(0.11, 0.04) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'cosmos', symbol: 'atom', name: 'Cosmos', image: '',
    current_price: 8.21, market_cap: 3200000000, market_cap_rank: 16,
    total_volume: 110000000, high_24h: 8.4, low_24h: 8.0,
    price_change_24h: 0.12, price_change_percentage_24h: 1.48,
    circulating_supply: 390000000,
    sparkline_in_7d: { price: sparkline(8.2, 0.04) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'monero', symbol: 'xmr', name: 'Monero', image: '',
    current_price: 158.4, market_cap: 2900000000, market_cap_rank: 17,
    total_volume: 60000000, high_24h: 162, low_24h: 156,
    price_change_24h: 1.21, price_change_percentage_24h: 0.77,
    circulating_supply: 18400000,
    sparkline_in_7d: { price: sparkline(158, 0.03) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'tron', symbol: 'trx', name: 'TRON', image: '',
    current_price: 0.1281, market_cap: 11000000000, market_cap_rank: 18,
    total_volume: 320000000, high_24h: 0.131, low_24h: 0.126,
    price_change_24h: 0.001, price_change_percentage_24h: 0.79,
    circulating_supply: 86400000000,
    sparkline_in_7d: { price: sparkline(0.128, 0.02) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'near', symbol: 'near', name: 'NEAR Protocol', image: '',
    current_price: 5.21, market_cap: 5800000000, market_cap_rank: 19,
    total_volume: 130000000, high_24h: 5.4, low_24h: 5.05,
    price_change_24h: -0.08, price_change_percentage_24h: -1.51,
    circulating_supply: 1110000000,
    sparkline_in_7d: { price: sparkline(5.2, 0.04) },
    last_updated: new Date().toISOString(),
  },
  {
    id: 'aptos', symbol: 'apt', name: 'Aptos', image: '',
    current_price: 7.42, market_cap: 3500000000, market_cap_rank: 20,
    total_volume: 90000000, high_24h: 7.7, low_24h: 7.2,
    price_change_24h: 0.11, price_change_percentage_24h: 1.51,
    circulating_supply: 472000000,
    sparkline_in_7d: { price: sparkline(7.4, 0.04) },
    last_updated: new Date().toISOString(),
  },
];

// Local ID → id used by the market_chart endpoint.
export const FALLBACK_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', BNB: 'binancecoin',
  SOL: 'solana', XRP: 'ripple', USDC: 'usd-coin', ADA: 'cardano',
  DOGE: 'dogecoin', AVAX: 'avalanche', MATIC: 'polygon', LINK: 'chainlink',
  LTC: 'litecoin', UNI: 'uniswap', XLM: 'stellar', ATOM: 'cosmos',
  XMR: 'monero', TRX: 'tron', NEAR: 'near', APT: 'aptos',
};

export function buildFallbackChart(symbol: string, days: number): { prices: [number, number][] } {
  const coin = FALLBACK_COINS.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
  const series = coin?.sparkline_in_7d?.price ?? sparkline(100, 0.04, 200);
  const totalPoints = Math.min(series.length, Math.max(24, days * 24));
  const step = Math.floor(series.length / totalPoints);
  const now = Date.now();
  const span = days * 24 * 60 * 60 * 1000;
  const prices: [number, number][] = [];
  for (let i = 0; i < totalPoints; i += 1) {
    const price = series[i * step] ?? series[series.length - 1];
    const t = now - span + (i / totalPoints) * span;
    prices.push([t, price]);
  }
  return { prices };
}

export const FALLBACK_GLOBAL = {
  total_market_cap: { usd: 2_410_000_000_000 },
  total_volume: { usd: 78_000_000_000 },
  market_cap_percentage: { btc: 54.2, eth: 17.1 },
  active_cryptocurrencies: FALLBACK_COINS.length,
  markets: 720,
  market_cap_change_percentage_24h_usd: 0.42,
};
