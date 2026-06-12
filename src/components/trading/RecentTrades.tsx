import { useEffect, useState } from 'react';

interface RecentTradesProps {
  midPrice: number;
  precision?: number;
}

interface TradeRow {
  id: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  time: number;
}

export default function RecentTrades({ midPrice, precision = 2 }: RecentTradesProps) {
  const [rows, setRows] = useState<TradeRow[]>([]);

  useEffect(() => {
    const seed = Array.from({ length: 20 }).map((_, i) => {
      const drift = (Math.random() - 0.5) * 0.004 * midPrice;
      const price = +(midPrice + drift).toFixed(precision);
      const amount = +(Math.random() * 1.4 + 0.001).toFixed(4);
      const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
      return {
        id: Date.now() + i,
        price,
        amount,
        side,
        time: Date.now() - i * 1500,
      };
    });
    setRows(seed);
  }, [midPrice, precision]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRows((prev) => {
        const drift = (Math.random() - 0.5) * 0.005 * midPrice;
        const next: TradeRow = {
          id: Date.now(),
          price: +(midPrice + drift).toFixed(precision),
          amount: +(Math.random() * 1.4 + 0.001).toFixed(4),
          side: Math.random() > 0.5 ? 'buy' : 'sell',
          time: Date.now(),
        };
        return [next, ...prev].slice(0, 20);
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [midPrice, precision]);

  return (
    <div className="card">
      <div className="px-3 py-2 border-b border-border text-sm font-semibold">Recent Trades</div>
      <div className="px-3 py-2 grid grid-cols-3 text-xs text-text-tertiary">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>
      <div>
        {rows.map((r) => (
          <div
            key={r.id}
            className="px-3 py-1 text-xs grid grid-cols-3"
          >
            <span className={`tabular-nums ${r.side === 'buy' ? 'text-up' : 'text-down'}`}>
              {r.price.toFixed(precision)}
            </span>
            <span className="text-right tabular-nums text-text-secondary">{r.amount}</span>
            <span className="text-right text-text-tertiary">
              {new Date(r.time).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
