// Wallet cards: the four hero balances that anchor the dashboard.
// Each card is bound to the authenticated user, calculated from the
// per-user balances, holdings, and bonuses stores, and valued in USD
// against the live CoinGecko market data.

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTradingStore, type Balances } from '../../store/tradingStore';
import { useMarketStore } from '../../store/marketStore';
import { formatCurrency, formatPercent } from '../../lib/format';

interface Props {
  compact?: boolean;
}

function valueUsd(b: Balances, price: (sym: string) => number): number {
  return Object.entries(b).reduce((acc, [sym, amt]) => {
    return acc + (amt || 0) * price(sym);
  }, 0);
}

export default function WalletCards({ compact = false }: Props) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'default';

  // Read each bucket individually so the card re-renders whenever any
  // bucket changes.
  const balances = useTradingStore((s) => s.balances[userId]);
  const holdings = useTradingStore((s) => s.holdings?.[userId]);
  const bonuses = useTradingStore((s) => s.bonuses?.[userId]);
  const coins = useMarketStore((s) => s.coins);
  const lastUpdated = useMarketStore((s) => s.lastUpdated);

  // USD value of the user's portfolio over the last 24h. We use a
  // 24h delta proxy based on the weighted average price change of held
  // assets, but only when we have price-change data.
  const [deltaPct, setDeltaPct] = useState<number | null>(null);
  useEffect(() => {
    const total = valueUsd(balances ?? {}, priceOf);
    const hold = valueUsd(holdings ?? {}, priceOf);
    const bonus = valueUsd(bonuses ?? {}, priceOf);
    const overall = total + hold + bonus;
    if (overall <= 0) { setDeltaPct(null); return; }
    // weighted pct
    let weighted = 0;
    for (const [sym, amt] of Object.entries(balances ?? {})) {
      const coin = coins.find((c) => c.symbol.toUpperCase() === sym);
      if (!coin) continue;
      const usd = (amt || 0) * (coin.current_price ?? 0);
      weighted += usd * (coin.price_change_percentage_24h ?? 0);
    }
    for (const [sym, amt] of Object.entries(bonuses ?? {})) {
      const coin = coins.find((c) => c.symbol.toUpperCase() === sym);
      if (!coin) continue;
      const usd = (amt || 0) * (coin.current_price ?? 0);
      weighted += usd * (coin.price_change_percentage_24h ?? 0);
    }
    setDeltaPct(weighted / overall);
  }, [balances, holdings, bonuses, coins]);

  function priceOf(sym: string): number {
    if (sym === 'USDT' || sym === 'USDC') return 1;
    return coins.find((c) => c.symbol.toUpperCase() === sym)?.current_price ?? 0;
  }

  const total = valueUsd(balances ?? {}, priceOf) + valueUsd(holdings ?? {}, priceOf) + valueUsd(bonuses ?? {}, priceOf);
  const holding = valueUsd(holdings ?? {}, priceOf);
  const available = valueUsd(balances ?? {}, priceOf);
  const bonus = valueUsd(bonuses ?? {}, priceOf);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <TotalCard
        total={total}
        deltaPct={deltaPct}
        updatedAt={lastUpdated}
        userEmail={user?.email}
        compact={compact}
      />
      <HoldingCard holding={holding} />
      <AvailableCard available={available} />
      <BonusCard bonus={bonus} />
    </div>
  );
}

function Card({
  label,
  amount,
  hint,
  icon,
  accent,
  meta,
}: {
  label: string;
  amount: string;
  hint?: string;
  icon: React.ReactNode;
  accent: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className={`card p-4 relative overflow-hidden`}>
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${accent} opacity-10`} />
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-7 h-7 rounded-full ${accent} text-bg-primary flex items-center justify-center`}>
          {icon}
        </span>
        <p className="text-xs uppercase tracking-wide font-semibold text-text-tertiary">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight">{amount}</p>
      {hint && <p className="text-xs text-text-tertiary mt-1">{hint}</p>}
      {meta && <div className="text-xs mt-2">{meta}</div>}
    </div>
  );
}

function TotalCard({ total, deltaPct, updatedAt, userEmail, compact }: { total: number; deltaPct: number | null; updatedAt: number | null; userEmail?: string; compact: boolean }) {
  return (
    <div className={`card p-4 sm:p-5 relative overflow-hidden`}>
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-brand-gold opacity-10" />
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-full bg-brand-gold text-bg-primary flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7L9 18l-5-5" />
          </svg>
        </span>
        <p className="text-xs uppercase tracking-wide font-semibold text-text-tertiary">Total Balance</p>
      </div>
      <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">{formatCurrency(total)}</p>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {deltaPct !== null && (
          <span className={`pill ${deltaPct >= 0 ? 'text-up' : 'text-down'} text-xs`}>
            {deltaPct >= 0 ? '▲' : '▼'} {formatPercent(deltaPct)} <span className="text-text-tertiary">24h</span>
          </span>
        )}
        {updatedAt && (
          <span className="text-[11px] text-text-tertiary">
            Updated {new Date(updatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>
      {userEmail && !compact && (
        <p className="text-[11px] text-text-tertiary mt-2 truncate">
          Account: {userEmail}
        </p>
      )}
    </div>
  );
}

function HoldingCard({ holding }: { holding: number }) {
  return (
    <Card
      label="Holding Balance"
      amount={formatCurrency(holding)}
      hint="Value locked in open orders"
      accent="bg-amber-500"
      icon={
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      }
    />
  );
}

function AvailableCard({ available }: { available: number }) {
  return (
    <Card
      label="Available Balance"
      amount={formatCurrency(available)}
      hint="Free to trade or withdraw"
      accent="bg-up"
      icon={
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      }
    />
  );
}

function BonusCard({ bonus }: { bonus: number }) {
  return (
    <Card
      label="Bonus Balance"
      amount={formatCurrency(bonus)}
      hint="Promotional credits"
      accent="bg-violet-500"
      icon={
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      }
    />
  );
}
