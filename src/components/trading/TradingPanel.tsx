import { useMemo, useState } from 'react';
import { useTradingStore } from '../../store/tradingStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from '../ui/Toast';
import { formatCurrency } from '../../lib/format';
import type { OrderSide, OrderType } from '../../types';

interface TradingPanelProps {
  symbol: string;
  base: string;
  quote: string;
  price: number;
}

const QUICK_PCTS = [25, 50, 75, 100];

export default function TradingPanel({ symbol, base, quote, price }: TradingPanelProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const balances = useTradingStore((s) => s.balances);
  const placeOrder = useTradingStore((s) => s.placeOrder);
  const navigate = useNavigate();

  const [side, setSide] = useState<OrderSide>('buy');
  const [type, setType] = useState<OrderType>('market');
  const [orderTypeLocked] = useState(false);
  const [priceInput, setPriceInput] = useState<string>(price.toString());
  const [amountInput, setAmountInput] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const userId = user?.id ?? 'default';
  const userBalances = balances[userId] ?? { USDT: 0 };

  const numericPrice = Number(priceInput) || 0;
  const numericAmount = Number(amountInput) || 0;
  const total = numericAmount * (type === 'market' ? price : numericPrice);
  const fee = total * 0.001;
  const cost = total + (side === 'buy' ? fee : 0);

  const available = side === 'buy' ? userBalances[quote] ?? 0 : userBalances[base] ?? 0;
  const insufficient = side === 'buy' ? available < cost : available < numericAmount;
  const canSubmit =
    isAuthenticated &&
    numericAmount > 0 &&
    (type === 'market' || numericPrice > 0) &&
    !insufficient &&
    !submitting;

  function setPct(p: number) {
    if (side === 'buy') {
      const usable = (userBalances[quote] ?? 0) * (p / 100);
      const denom = (type === 'market' ? price : numericPrice) * 1.001;
      const amt = denom > 0 ? usable / denom : 0;
      setAmountInput(amt > 0 ? amt.toFixed(6) : '');
    } else {
      const amt = (userBalances[base] ?? 0) * (p / 100);
      setAmountInput(amt > 0 ? amt.toFixed(6) : '');
    }
  }

  function submit() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    const res = placeOrder({
      symbol,
      base,
      quote,
      side,
      type,
      price: type === 'market' ? price : numericPrice,
      amount: numericAmount,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast(res.error ?? 'Order failed', 'error');
      return;
    }
    toast(
      `${side === 'buy' ? 'Bought' : 'Sold'} ${numericAmount.toFixed(6)} ${base} at ${formatCurrency(
        type === 'market' ? price : numericPrice,
      )}`,
      'success',
    );
    setAmountInput('');
  }

  const tabs = useMemo(
    () => [
      { key: 'buy' as const, label: 'Buy', className: 'btn-up' },
      { key: 'sell' as const, label: 'Sell', className: 'btn-down' },
    ],
    [],
  );

  return (
    <div className="card p-4 space-y-3">
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSide(t.key)}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
              side === t.key
                ? t.key === 'buy'
                  ? 'bg-up text-white'
                  : 'bg-down text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label} {base}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-text-tertiary">Order type</span>
        {(['market', 'limit'] as OrderType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-2 py-1 rounded ${
              type === t ? 'bg-bg-tertiary text-text-primary' : 'text-text-tertiary hover:text-text-primary'
            }`}
            disabled={orderTypeLocked}
          >
            {t === 'market' ? 'Market' : 'Limit'}
          </button>
        ))}
      </div>
      {type === 'limit' && (
        <label className="block">
          <span className="label">Price ({quote})</span>
          <input
            className="input mt-1"
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </label>
      )}
      <label className="block">
        <span className="label">Amount ({base})</span>
        <input
          className="input mt-1"
          inputMode="decimal"
          placeholder="0.00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value.replace(/[^\d.]/g, ''))}
        />
      </label>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_PCTS.map((p) => (
          <button
            key={p}
            onClick={() => setPct(p)}
            className="rounded bg-bg-tertiary hover:bg-bg-hover text-xs py-1"
          >
            {p}%
          </button>
        ))}
      </div>
      <div className="text-xs space-y-1">
        <div className="flex justify-between text-text-tertiary">
          <span>Available {side === 'buy' ? quote : base}</span>
          <span className="text-text-secondary tabular-nums">
            {(side === 'buy' ? userBalances[quote] ?? 0 : userBalances[base] ?? 0).toFixed(6)}
          </span>
        </div>
        <div className="flex justify-between text-text-tertiary">
          <span>Order value</span>
          <span className="text-text-secondary tabular-nums">
            {formatCurrency(total, 'USD', { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between text-text-tertiary">
          <span>Fee (0.1%)</span>
          <span className="text-text-secondary tabular-nums">
            {formatCurrency(fee, 'USD', { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      {!isAuthenticated ? (
        <button onClick={() => navigate('/login')} className="btn-primary w-full">
          Log in to trade
        </button>
      ) : (
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={`w-full ${side === 'buy' ? 'btn-up' : 'btn-down'}`}
        >
          {side === 'buy' ? `Buy ${base}` : `Sell ${base}`}
        </button>
      )}
      {insufficient && isAuthenticated && numericAmount > 0 && (
        <p className="text-xs text-down">Insufficient {side === 'buy' ? quote : base} balance.</p>
      )}
    </div>
  );
}
