import { useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTradingStore } from '../store/tradingStore';
import { formatCurrency } from '../lib/format';
import { toast } from '../components/ui/Toast';

type Filter = 'all' | 'buy' | 'sell';

export default function OrderHistory() {
  const user = useAuthStore((s) => s.user);
  const orders = useTradingStore((s) => s.orders);
  const cancel = useTradingStore((s) => s.cancelOrder);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const userId = user?.id ?? 'default';
  const list = useMemo(() => {
    return (orders[userId] ?? [])
      .filter((o) => (filter === 'all' ? true : o.side === filter))
      .filter((o) => (search ? o.symbol.toLowerCase().includes(search.toLowerCase()) : true));
  }, [orders, userId, filter, search]);

  const totalBought = list.filter((o) => o.side === 'buy').reduce((acc, o) => acc + o.total, 0);
  const totalSold = list.filter((o) => o.side === 'sell').reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Order history</h1>
        <p className="text-text-tertiary text-sm">All your filled and cancelled orders.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="label">Orders</p>
          <p className="stat mt-1">{list.length}</p>
        </div>
        <div className="card p-4">
          <p className="label">Total bought</p>
          <p className="stat mt-1 text-up">{formatCurrency(totalBought)}</p>
        </div>
        <div className="card p-4">
          <p className="label">Total sold</p>
          <p className="stat mt-1 text-down">{formatCurrency(totalSold)}</p>
        </div>
      </section>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
          <div className="flex bg-bg-tertiary rounded-md overflow-hidden text-sm">
            {(['all', 'buy', 'sell'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 ${
                  filter === f ? 'bg-bg-hover text-text-primary' : 'text-text-secondary'
                }`}
              >
                {f === 'all' ? 'All' : f === 'buy' ? 'Buy' : 'Sell'}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by pair (e.g. BTC)"
            className="input max-w-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-text-tertiary">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Pair</th>
                <th className="px-3 py-2 text-left">Side</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-b border-border/60">
                  <td className="px-3 py-2 text-text-tertiary">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-medium">{o.symbol}</td>
                  <td className={`px-3 py-2 ${o.side === 'buy' ? 'text-up' : 'text-down'}`}>
                    {o.side.toUpperCase()}
                  </td>
                  <td className="px-3 py-2 capitalize text-text-secondary">{o.type}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(o.price)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{o.amount.toFixed(6)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(o.total)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="pill">{o.status}</span>
                    {o.status === 'open' && (
                      <button
                        onClick={() => {
                          cancel(o.id);
                          toast('Order cancelled', 'info');
                        }}
                        className="ml-2 text-xs text-down hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-text-tertiary">
                    No orders match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
