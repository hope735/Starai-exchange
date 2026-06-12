// Live ticker — horizontally scrolling ticker of the top markets. Used
// underneath the top navigation so users always see live market activity.

import { useEffect, useRef, useState } from 'react';
import { useMarketStore } from '../../store/marketStore';
import { formatCurrency, formatPercent } from '../../lib/format';

export default function PriceTicker() {
  const coins = useMarketStore((s) => s.coins);
  const fetchMarkets = useMarketStore((s) => s.fetch);
  const startAutoRefresh = useMarketStore((s) => s.startAutoRefresh);
  const stopAutoRefresh = useMarketStore((s) => s.stopAutoRefresh);

  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(40);

  useEffect(() => {
    try {
      if (coins.length === 0) fetchMarkets();
      startAutoRefresh(60_000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[PriceTicker] refresh failed', e);
    }
    return () => {
      try { stopAutoRefresh(); } catch { /* noop */ }
    };
  }, [coins.length, fetchMarkets, startAutoRefresh, stopAutoRefresh]);

  // Adjust animation duration to coin count so it always feels similar speed
  useEffect(() => {
    if (coins.length === 0) return;
    setDuration(Math.max(20, coins.length * 2));
  }, [coins.length]);

  if (coins.length === 0) {
    return (
      <div className="bg-bg-primary border-b border-border overflow-hidden h-9 flex items-center text-xs text-text-tertiary">
        <div className="px-4">Loading live market ticker…</div>
      </div>
    );
  }

  // Duplicate the list so the marquee can wrap seamlessly
  const list = coins.slice(0, 24);
  const doubled = [...list, ...list];

  return (
    <div
      className="bg-bg-primary border-b border-border overflow-hidden h-9 flex items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Live market ticker"
    >
      <div
        ref={trackRef}
        className="flex items-center gap-6 whitespace-nowrap will-change-transform"
        style={{
          animation: `ticker ${duration}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
          paddingLeft: '1rem',
        }}
      >
        {doubled.map((c, i) => {
          const up = (c.price_change_percentage_24h ?? 0) >= 0;
          return (
            <a
              key={`${c.id}-${i}`}
              href={`/trade/${c.symbol.toUpperCase()}USDT`}
              className="text-xs flex items-center gap-1.5 hover:text-text-primary text-text-secondary"
            >
              <span className="font-semibold">{c.symbol.toUpperCase()}</span>
              <span className="tabular-nums">{formatCurrency(c.current_price)}</span>
              <span className={up ? 'text-up tabular-nums' : 'text-down tabular-nums'}>
                {up ? '▲' : '▼'} {formatPercent(c.price_change_percentage_24h)}
              </span>
            </a>
          );
        })}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
