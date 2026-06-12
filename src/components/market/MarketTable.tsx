import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMarketStore } from '../../store/marketStore';
import CoinIcon from '../ui/CoinIcon';
import ChangeCell from '../ui/ChangeCell';
import Sparkline from '../ui/Sparkline';
import { formatCurrency, formatNumber } from '../../lib/format';
import Spinner from '../ui/Spinner';

type SortKey = 'rank' | 'name' | 'price' | 'change' | 'volume' | 'marketcap';
type SortDir = 'asc' | 'desc';

interface MarketTableProps {
  compact?: boolean;
  limit?: number;
}

const PRICE_FLASH_MS = 1500;

export default function MarketTable({ compact = false, limit }: MarketTableProps) {
  const coins = useMarketStore((s) => s.coins);
  const loading = useMarketStore((s) => s.loading);
  const error = useMarketStore((s) => s.error);
  const lastUpdated = useMarketStore((s) => s.lastUpdated);
  const fetchMarkets = useMarketStore((s) => s.fetch);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [flash, setFlash] = useState<Record<string, 'up' | 'down' | undefined>>({});
  const previousPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    if (coins.length === 0) fetchMarkets();
  }, [fetchMarkets, coins.length]);

  // Detect price changes for flash animation
  useEffect(() => {
    const next: Record<string, number> = {};
    const flashes: Record<string, 'up' | 'down' | undefined> = {};
    for (const c of coins) {
      const prev = previousPrices.current[c.id];
      next[c.id] = c.current_price;
      if (prev !== undefined && prev !== c.current_price) {
        flashes[c.id] = c.current_price > prev ? 'up' : 'down';
      }
    }
    if (Object.keys(flashes).length) {
      setFlash((f) => ({ ...f, ...flashes }));
      const handle = window.setTimeout(() => setFlash({}), PRICE_FLASH_MS);
      previousPrices.current = next;
      return () => window.clearTimeout(handle);
    }
    previousPrices.current = next;
  }, [coins]);

  const filtered = coins
    .filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortKey) {
        case 'name':
          av = a.name; bv = b.name; break;
        case 'price':
          av = a.current_price; bv = b.current_price; break;
        case 'change':
          av = a.price_change_percentage_24h; bv = b.price_change_percentage_24h; break;
        case 'volume':
          av = a.total_volume; bv = b.total_volume; break;
        case 'marketcap':
          av = a.market_cap; bv = b.market_cap; break;
        default:
          av = a.market_cap_rank; bv = b.market_cap_rank;
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });

  const data = limit ? filtered.slice(0, limit) : filtered;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '';

  if (loading && coins.length === 0) {
    return (
      <div className="card p-6 flex items-center justify-center min-h-[300px]">
        <Spinner size={28} />
        <span className="ml-3 text-text-secondary">Loading market data…</span>
      </div>
    );
  }

  if (error && coins.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-down font-semibold">Failed to load market data</p>
        <p className="text-text-tertiary text-sm mt-1">{error}</p>
        <button onClick={() => fetchMarkets()} className="btn-outline mt-3">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search coin"
          className="input max-w-xs"
        />
        <div className="flex-1" />
        {lastUpdated && (
          <span className="text-xs text-text-tertiary">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
        <button onClick={() => fetchMarkets()} className="btn-ghost text-xs">Refresh</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-text-tertiary text-xs uppercase">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left w-10">#</th>
              <th
                className="px-3 py-2 text-left cursor-pointer"
                onClick={() => toggleSort('name')}
              >
                Name {sortIndicator('name')}
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer"
                onClick={() => toggleSort('price')}
              >
                Price {sortIndicator('price')}
              </th>
              {!compact && (
                <th
                  className="px-3 py-2 text-right cursor-pointer hidden md:table-cell"
                  onClick={() => toggleSort('change')}
                >
                  24h % {sortIndicator('change')}
                </th>
              )}
              {!compact && (
                <th
                  className="px-3 py-2 text-right cursor-pointer hidden lg:table-cell"
                  onClick={() => toggleSort('volume')}
                >
                  24h Volume {sortIndicator('volume')}
                </th>
              )}
              {!compact && (
                <th
                  className="px-3 py-2 text-right cursor-pointer hidden lg:table-cell"
                  onClick={() => toggleSort('marketcap')}
                >
                  Market Cap {sortIndicator('marketcap')}
                </th>
              )}
              {!compact && <th className="px-3 py-2 text-right hidden md:table-cell">Last 7d</th>}
              <th className="px-3 py-2 text-right">Trade</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => {
              const flashClass = flash[c.id] === 'up' ? 'flash-up' : flash[c.id] === 'down' ? 'flash-down' : '';
              return (
                <tr
                  key={c.id}
                  className={`border-b border-border/60 hover:bg-bg-tertiary/60 transition-colors ${flashClass}`}
                >
                  <td className="px-3 py-2 text-text-tertiary">{c.market_cap_rank}</td>
                  <td className="px-3 py-2">
                    <Link to={`/trade/${c.symbol.toUpperCase()}USDT`} className="flex items-center gap-3">
                      <CoinIcon symbol={c.symbol} image={c.image} size={24} />
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-text-tertiary text-xs uppercase">{c.symbol}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(c.current_price)}
                  </td>
                  {!compact && (
                    <td className="px-3 py-2 text-right hidden md:table-cell">
                      <ChangeCell value={c.price_change_percentage_24h} />
                    </td>
                  )}
                  {!compact && (
                    <td className="px-3 py-2 text-right tabular-nums hidden lg:table-cell text-text-secondary">
                      {formatCurrency(c.total_volume, 'USD', { notation: 'compact' })}
                    </td>
                  )}
                  {!compact && (
                    <td className="px-3 py-2 text-right tabular-nums hidden lg:table-cell text-text-secondary">
                      {formatNumber(c.market_cap, { notation: 'compact' })}
                    </td>
                  )}
                  {!compact && (
                    <td className="px-3 py-2 hidden md:table-cell">
                      <div className="flex justify-end">
                        <Sparkline
                          data={c.sparkline_in_7d?.price}
                          positive={c.price_change_percentage_24h >= 0}
                          width={120}
                          height={36}
                        />
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/trade/${c.symbol.toUpperCase()}USDT`}
                      className="btn-ghost px-3 py-1 text-xs"
                    >
                      Trade
                    </Link>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-text-tertiary">
                  No coins match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
