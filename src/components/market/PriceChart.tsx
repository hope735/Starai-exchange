import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getMarketChart } from '../../lib/api';
import Spinner from '../ui/Spinner';
import { formatCurrency } from '../../lib/format';

interface PriceChartProps {
  coinId: string;
  coinName: string;
  days?: number;
  height?: number;
}

interface ChartPoint {
  t: number;
  price: number;
}

export default function PriceChart({ coinId, coinName, days = 7, height = 360 }: PriceChartProps) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getMarketChart({ id: coinId, days })
      .then((res) => {
        if (!alive) return;
        const points = res.prices.map(([t, p]) => ({ t, price: p }));
        setData(points);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [coinId, days]);

  const { positive, minPrice, maxPrice, change } = useMemo(() => {
    if (data.length < 2) return { positive: true, minPrice: 0, maxPrice: 0, change: 0 };
    const first = data[0].price;
    const last = data[data.length - 1].price;
    const min = Math.min(...data.map((p) => p.price));
    const max = Math.max(...data.map((p) => p.price));
    return {
      positive: last >= first,
      minPrice: min,
      maxPrice: max,
      change: ((last - first) / first) * 100,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="card p-6 flex items-center justify-center" style={{ height }}>
        <Spinner size={28} />
        <span className="ml-3 text-text-secondary">Loading chart for {coinName}…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="card p-6 text-center" style={{ height }}>
        <p className="text-down font-semibold">Chart unavailable</p>
        <p className="text-text-tertiary text-sm mt-1">{error}</p>
      </div>
    );
  }

  const stroke = positive ? '#02c076' : '#f6465d';
  const gradientId = `g-${positive ? 'u' : 'd'}`;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-text-tertiary">{coinName} · last {days}d</p>
          <p className={`text-lg font-semibold ${positive ? 'text-up' : 'text-down'}`}>
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}%
          </p>
        </div>
        <div className="text-xs text-text-tertiary">
          <span>High: </span>
          <span className="text-text-secondary">{formatCurrency(maxPrice)}</span>
          <span className="mx-2">·</span>
          <span>Low: </span>
          <span className="text-text-secondary">{formatCurrency(minPrice)}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e2329" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v: number) =>
              new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
            stroke="#848e9c"
            fontSize={11}
            minTickGap={32}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(v < 1 ? 4 : 2)
            }
            stroke="#848e9c"
            fontSize={11}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: '#161a1e',
              border: '1px solid #2b3139',
              borderRadius: 8,
              color: '#eaecef',
            }}
            labelFormatter={(v: number) => new Date(v).toLocaleString()}
            formatter={(v: number) => [formatCurrency(v), 'Price']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
