import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMarketStore } from '../store/marketStore';
import PriceChart from '../components/market/PriceChart';
import OrderBook from '../components/market/OrderBook';
import RecentTrades from '../components/trading/RecentTrades';
import TradingPanel from '../components/trading/TradingPanel';
import CoinIcon from '../components/ui/CoinIcon';
import ChangeCell from '../components/ui/ChangeCell';
import { formatCurrency } from '../lib/format';
import Spinner from '../components/ui/Spinner';

const POPULAR = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'LINK'];

export default function Trading() {
  const { symbol } = useParams<{ symbol?: string }>();
  const navigate = useNavigate();
  const coins = useMarketStore((s) => s.coins);
  const fetchMarkets = useMarketStore((s) => s.fetch);
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    if (coins.length === 0) fetchMarkets();
  }, [coins.length, fetchMarkets]);

  const { base, quote, coin } = useMemo(() => {
    const raw = (symbol ?? 'BTCUSDT').toUpperCase();
    let b = 'BTC';
    let q = 'USDT';
    for (const suffix of ['USDT', 'USDC', 'BTC', 'ETH', 'BNB']) {
      if (raw.endsWith(suffix) && raw.length > suffix.length) {
        b = raw.slice(0, raw.length - suffix.length);
        q = suffix;
        break;
      }
    }
    if (raw.includes('/')) {
      const parts = raw.split('/');
      b = parts[0];
      q = parts[1];
    }
    const c = coins.find((x) => x.symbol.toUpperCase() === b);
    return { base: b, quote: q, coin: c };
  }, [symbol, coins]);

  function selectPair(newBase: string) {
    navigate(`/trade/${newBase}USDT`);
  }

  if (coins.length === 0) {
    return (
      <div className="card p-10 flex flex-col items-center justify-center">
        <Spinner size={28} />
        <p className="mt-3 text-text-secondary">Loading trading pairs…</p>
      </div>
    );
  }

  const price = coin?.current_price ?? 0;
  const change = coin?.price_change_percentage_24h ?? 0;
  const high = coin?.high_24h ?? 0;
  const low = coin?.low_24h ?? 0;
  const volume = coin?.total_volume ?? 0;
  const precision = price >= 1000 ? 2 : price >= 1 ? 4 : 6;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <CoinIcon symbol={base} image={coin?.image} size={36} />
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">
              {coin?.name ?? base} <span className="text-text-tertiary text-sm">/{quote}</span>
            </h1>
            <p className="text-text-tertiary text-xs uppercase">
              {base}/{quote} spot
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 ml-0 md:ml-6">
          <Stat label="Price" value={formatCurrency(price)} />
          <Stat
            label="24h Change"
            value={<ChangeCell value={change} className="text-lg font-semibold" />}
          />
          <Stat label="24h High" value={formatCurrency(high)} />
          <Stat label="24h Low" value={formatCurrency(low)} />
          <Stat
            label="24h Volume"
            value={formatCurrency(volume, 'USD', { notation: 'compact' })}
          />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs">
          {[1, 7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2 py-1 rounded ${
                days === d
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              {d === 1 ? '24h' : d === 7 ? '7d' : d === 30 ? '1m' : d === 90 ? '3m' : '1y'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_340px]">
        {/* Pair selector */}
        <aside className="card p-3 max-h-[640px] overflow-y-auto">
          <p className="label">Popular</p>
          <ul className="mt-2 space-y-1">
            {POPULAR.map((s) => (
              <li key={s}>
                <button
                  onClick={() => selectPair(s)}
                  className={`w-full flex items-center justify-between rounded px-2 py-1.5 text-sm ${
                    s === base
                      ? 'bg-bg-tertiary text-text-primary'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  <span>{s}/USDT</span>
                  {coins.find((c) => c.symbol.toUpperCase() === s) && (
                    <ChangeCell
                      value={coins.find((c) => c.symbol.toUpperCase() === s)!.price_change_percentage_24h}
                      className="text-xs"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Chart + trades */}
        <div className="space-y-4 min-w-0">
          {coin ? (
            <PriceChart coinId={coin.id} coinName={coin.name} days={days} height={360} />
          ) : (
            <div className="card p-6 h-[400px] flex items-center justify-center text-text-tertiary">
              Select a trading pair from the list.
            </div>
          )}
          <RecentTrades midPrice={price} precision={precision} />
        </div>

        {/* Trading panel + book */}
        <div className="space-y-4">
          <TradingPanel symbol={`${base}/${quote}`} base={base} quote={quote} price={price} />
          <OrderBook midPrice={price} precision={precision} rows={6} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
