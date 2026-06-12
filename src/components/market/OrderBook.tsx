import { useMemo } from 'react';

interface OrderBookProps {
  midPrice: number;
  precision?: number;
  rows?: number;
}

// Simulated order book generated from a mid price. Gives the trading page
// a realistic feel without depending on a private WebSocket feed.
export default function OrderBook({ midPrice, precision = 2, rows = 8 }: OrderBookProps) {
  // Defensive: if midPrice is 0 (market data not loaded yet) or not a
  // finite number, fall back to a neutral placeholder so the order book
  // never renders NaN/Infinity rows that would break the table layout.
  const safeMid = Number.isFinite(midPrice) && midPrice > 0 ? midPrice : 1;

  const { asks, bids, maxSize, label } = useMemo(() => {
    const tick = Math.pow(10, -precision);
    const step = Math.max(tick, safeMid * 0.0002);
    const seed = (offset: number) =>
      Math.abs(Math.sin(offset * 9301 + safeMid * 13.37) * 10000) / 10000;
    const askRows = Array.from({ length: rows }).map((_, i) => {
      const price = safeMid + step * (rows - i);
      const size = +(0.05 + seed(i) * 1.8).toFixed(4);
      return { price, size };
    });
    const bidRows = Array.from({ length: rows }).map((_, i) => {
      const price = safeMid - step * (i + 1);
      const size = +(0.05 + seed(i + rows) * 1.8).toFixed(4);
      return { price, size };
    });
    const max = Math.max(...askRows.concat(bidRows).map((r) => r.size), 0.0001);
    return { asks: askRows, bids: bidRows, maxSize: max, label: safeMid.toFixed(precision).replace(/\d/g, '') };
  }, [safeMid, precision, rows]);

  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(precision) : '—');

  if (!Number.isFinite(midPrice) || midPrice <= 0) {
    return (
      <div className="card p-6 text-center text-text-tertiary text-sm">
        Waiting for live price…
      </div>
    );
  }

  return (
    <div className="card">
      <div className="px-3 py-2 border-b border-border text-sm font-semibold flex items-center justify-between">
        <span>Order Book</span>
        <span className="text-xs text-text-tertiary">simulated</span>
      </div>
      <div className="px-3 py-2 grid grid-cols-2 text-xs text-text-tertiary">
        <span>Price ({label})</span>
        <span className="text-right">Size</span>
      </div>
      <div>
        {[...asks].reverse().map((row, idx) => (
          <div
            key={`a-${idx}`}
            className="relative px-3 py-1 text-xs flex justify-between"
          >
            <span
              className="absolute right-0 top-0 bottom-0 bg-down/15"
              style={{ width: `${(row.size / maxSize) * 100}%` }}
              aria-hidden
            />
            <span className="relative text-down tabular-nums">{fmt(row.price)}</span>
            <span className="relative tabular-nums">{row.size}</span>
          </div>
        ))}
        <div className="px-3 py-2 text-center text-sm font-semibold text-brand-gold border-y border-border">
          {fmt(midPrice)}
        </div>
        {bids.map((row, idx) => (
          <div
            key={`b-${idx}`}
            className="relative px-3 py-1 text-xs flex justify-between"
          >
            <span
              className="absolute right-0 top-0 bottom-0 bg-up/15"
              style={{ width: `${(row.size / maxSize) * 100}%` }}
              aria-hidden
            />
            <span className="relative text-up tabular-nums">{fmt(row.price)}</span>
            <span className="relative tabular-nums">{row.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
