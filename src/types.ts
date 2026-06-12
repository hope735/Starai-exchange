// Shared TypeScript types used across the StarAI exchange app.

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  sparkline_in_7d?: { price: number[] };
  last_updated?: string;
}

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';
export type OrderStatus = 'filled' | 'open' | 'cancelled' | 'partial';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
}

export interface Asset {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  value: number;
  change24h: number;
  icon?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
  twoFactorEnabled: boolean;
  kycStatus: 'unverified' | 'pending' | 'verified';
  /**
   * 12-word BIP-39-style Secret Recovery Phrase generated at signup. The
   * user is required to back it up and confirm it before the wallet
   * is fully set up. `phraseConfirmed` flips to true after verification.
   */
  recoveryPhrase: string[];
  phraseConfirmed: boolean;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  createdAt: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
