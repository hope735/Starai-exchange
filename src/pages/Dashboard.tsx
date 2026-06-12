import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMarketStore } from '../store/marketStore';
import { useAuthStore } from '../store/authStore';
import { useTradingStore } from '../store/tradingStore';
import MarketTable from '../components/market/MarketTable';
import PriceChart from '../components/market/PriceChart';
import { formatCurrency, formatNumber, formatPercent } from '../lib/format';
import ChangeCell from '../components/ui/ChangeCell';
import QuickActionsBar from '../components/wallet/QuickActions';
import WalletCards from '../components/wallet/WalletCards';


export default function Dashboard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const coins = useMarketStore((s) => s.coins);
  const fetchMarkets = useMarketStore((s) => s.fetch);
  const startAutoRefresh = useMarketStore((s) => s.startAutoRefresh);
  const stopAutoRefresh = useMarketStore((s) => s.stopAutoRefresh);
  const balances = useTradingStore((s) => s.balances);
  const orders = useTradingStore((s) => s.orders);
  const [global, setGlobal] = useState<any>(null);

  const userId = user?.id ?? 'default';
  const userBalances = balances[userId] ?? { USDT: 0 };

  useEffect(() => {
    fetchMarkets();
    startAutoRefresh();
    return () => stopAutoRefresh();
  }, [fetchMarkets, startAutoRefresh, stopAutoRefresh]);

  useEffect(() => {
    let alive = true;
    fetch('https://api.coingecko.com/api/v3/global')
      .then((r) => r.json())
      .then((res) => {
        if (alive) setGlobal(res?.data ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const totalValue = Object.entries(userBalances).reduce((acc, [sym, amt]) => {
    if (sym === 'USDT' || sym === 'USDC') return acc + amt;
    const coin = coins.find((c) => c.symbol.toUpperCase() === sym);
    return acc + (coin ? coin.current_price * amt : 0);
  }, 0);

  const featured = coins[0];
  const gainers = [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 4);
  const losers = [...coins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 4);

  const recentOrders = (orders[userId] ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Per-user wallet cards (Total / Holding / Available / Bonus) */}
      {isAuthenticated && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold">My wallet</h2>
              <p className="text-text-tertiary text-xs">
                Live balances for {user?.email}
              </p>
            </div>
            <Link to="/wallet" className="text-brand-gold text-xs hover:underline">
              Manage →
            </Link>
          </div>
          <WalletCards />
        </section>
      )}

      {/* Hero / market stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard

          label="Market Cap"
          value={global ? formatCurrency(global.total_market_cap?.usd, 'USD', { notation: 'compact' }) : '—'}
          sub={
            global ? (
              <ChangeCell value={global.market_cap_change_percentage_24h_usd} />
            ) : (
              <span className="text-text-tertiary">—</span>
            )
          }
        />
        <StatCard
          label="24h Volume"
          value={global ? formatCurrency(global.total_volume?.usd, 'USD', { notation: 'compact' }) : '—'}
          sub={<span className="text-text-tertiary">across {global?.markets ?? '—'} markets</span>}
        />
        <StatCard
          label="Active Coins"
          value={global ? formatNumber(global.active_cryptocurrencies) : '—'}
          sub={<span className="text-text-tertiary">listed on CoinGecko</span>}
        />
        <StatCard
          label={isAuthenticated ? 'Your Portfolio' : 'BTC Dominance'}
          value={
            isAuthenticated
              ? formatCurrency(totalValue)
              : global
                ? formatPercent(global.market_cap_percentage?.btc ?? 0)
                : '—'
          }
          sub={
            isAuthenticated ? (
              <Link to="/wallet" className="text-brand-gold hover:underline text-xs">View wallet →</Link>
            ) : (
              <span className="text-text-tertiary">ETH {formatPercent(global?.market_cap_percentage?.eth ?? 0)}</span>
            )
          }
        />
      </section>

      {/* Wallet quick actions (visible when signed in) */}
      {isAuthenticated && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Quick actions</h2>
            <Link to="/wallet" className="text-brand-gold text-xs hover:underline">Open wallet →</Link>
          </div>
          <QuickActionsBar defaultSymbol={featured?.symbol?.toUpperCase() ?? 'BTC'} />
        </section>
      )}

      {/* Featured chart + quick actions */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {featured ? (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <p className="text-text-tertiary text-sm">Featured</p>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {featured.name}{' '}
                    <span className="text-text-tertiary text-sm font-medium uppercase">
                      {featured.symbol}/USDT
                    </span>
                  </h2>
                  <p className="text-text-secondary">
                    {formatCurrency(featured.current_price)}{' '}
                    <ChangeCell value={featured.price_change_percentage_24h} className="ml-1" />
                  </p>
                </div>
                <Link to={`/trade/${featured.symbol.toUpperCase()}USDT`} className="btn-primary">
                  Trade {featured.symbol.toUpperCase()}
                </Link>
              </div>
              <PriceChart coinId={featured.id} coinName={featured.name} days={7} height={300} />
            </div>
          ) : (
            <div className="card p-6 h-[360px] flex items-center justify-center text-text-tertiary">
              Loading featured market…
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="card p-4">
            <h3 className="font-semibold mb-2">Top Gainers (24h)</h3>
            <ul className="space-y-2">
              {gainers.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <Link to={`/trade/${c.symbol.toUpperCase()}USDT`} className="flex items-center gap-2">
                    <img src={c.image} alt={c.symbol} className="w-5 h-5 rounded-full" loading="lazy" />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-text-tertiary text-xs uppercase">{c.symbol}</span>
                  </Link>
                  <ChangeCell value={c.price_change_percentage_24h} />
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold mb-2">Top Losers (24h)</h3>
            <ul className="space-y-2">
              {losers.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <Link to={`/trade/${c.symbol.toUpperCase()}USDT`} className="flex items-center gap-2">
                    <img src={c.image} alt={c.symbol} className="w-5 h-5 rounded-full" loading="lazy" />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-text-tertiary text-xs uppercase">{c.symbol}</span>
                  </Link>
                  <ChangeCell value={c.price_change_percentage_24h} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Markets table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">All Markets</h2>
          <Link to="/markets" className="text-brand-gold text-sm hover:underline">
            View all →
          </Link>
        </div>
        <MarketTable limit={15} />
      </section>

      {/* Recent orders */}
      {isAuthenticated && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Your recent orders</h2>
            <Link to="/orders" className="text-brand-gold text-sm hover:underline">
              Order history →
            </Link>
          </div>
          <div className="card overflow-hidden">
            {recentOrders.length === 0 ? (
              <p className="p-4 text-text-tertiary text-sm">
                No orders yet. Head to the{' '}
                <Link to="/trade" className="text-brand-gold hover:underline">
                  Trade
                </Link>{' '}
                page to place your first order.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-text-tertiary">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left">Pair</th>
                    <th className="px-3 py-2 text-left">Side</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Filled</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border/60">
                      <td className="px-3 py-2 font-medium">{o.symbol}</td>
                      <td className={`px-3 py-2 ${o.side === 'buy' ? 'text-up' : 'text-down'}`}>
                        {o.side.toUpperCase()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(o.price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{o.amount.toFixed(6)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(o.total)}</td>
                      <td className="px-3 py-2 text-right text-text-tertiary">
                        {new Date(o.filledAt ?? o.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className="stat mt-1">{value}</p>
      <div className="mt-1 text-xs">{sub}</div>
    </div>
  );
}
