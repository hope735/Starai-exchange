import { useEffect } from 'react';
import { useMarketStore } from '../store/marketStore';
import MarketTable from '../components/market/MarketTable';

export default function Markets() {
  const fetchMarkets = useMarketStore((s) => s.fetch);
  const startAutoRefresh = useMarketStore((s) => s.startAutoRefresh);
  const stopAutoRefresh = useMarketStore((s) => s.stopAutoRefresh);
  const lastUpdated = useMarketStore((s) => s.lastUpdated);

  useEffect(() => {
    fetchMarkets();
    startAutoRefresh();
    return () => stopAutoRefresh();
  }, [fetchMarkets, startAutoRefresh, stopAutoRefresh]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <p className="text-text-tertiary text-sm">
            Live prices for the top {100} cryptocurrencies by market cap.
            {lastUpdated && (
              <span className="ml-2">Updated {new Date(lastUpdated).toLocaleTimeString()}.</span>
            )}
          </p>
        </div>
      </header>
      <MarketTable />
    </div>
  );
}
