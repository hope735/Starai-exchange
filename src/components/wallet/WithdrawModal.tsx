import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTradingStore } from '../../store/tradingStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useMarketStore } from '../../store/marketStore';
import { useWalletStore } from '../../store/walletStore';
import Modal from '../ui/Modal';
import CoinIcon from '../ui/CoinIcon';
import { formatCurrency, formatNumber } from '../../lib/format';
import { toast } from '../ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  initialSymbol?: string;
}

export default function WithdrawModal({ open, onClose, initialSymbol = 'USDT' }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? 'default');
  const listCoins = useWalletStore((s) => s.listCoins);
  const getCoin = useWalletStore((s) => s.getCoin);
  const coins = useMarketStore((s) => s.coins);
  const addWithdraw = useTransactionStore((s) => s.addWithdraw);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setSymbol(initialSymbol);
      setAddress('');
      setAmount('');
      setSearch('');
    }
  }, [open, initialSymbol]);

  const supported = listCoins();
  const coin = getCoin(symbol);
  const balance = useTradingStore.getState().balances[userId]?.[symbol] ?? 0;
  const amt = Number(amount) || 0;
  const fee = coin ? coin.fee : 0;
  const total = amt + fee;
  const insufficient = total > balance;
  const belowMin = coin ? amt < coin.minWithdraw : false;
  const price = coins.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase())?.current_price ?? (symbol === 'USDT' || symbol === 'USDC' ? 1 : 0);
  const usd = amt * price;

  const filtered = useMemo(() => {
    if (!search) return supported;
    const q = search.toLowerCase();
    return supported.filter(
      (c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.network.toLowerCase().includes(q),
    );
  }, [supported, search]);

  function setMax() {
    if (!coin) return;
    const usable = Math.max(0, balance - fee);
    setAmount(usable > 0 ? usable.toFixed(coin.decimals) : '0');
  }

  function submit() {
    if (!coin) return;
    if (!address || address.length < 8) { toast('Enter a valid destination address', 'error'); return; }
    if (!Number.isFinite(amt) || amt <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (insufficient) { toast('Insufficient balance for amount + network fee', 'error'); return; }
    if (belowMin) { toast(`Minimum withdrawal is ${coin.minWithdraw} ${coin.symbol}`, 'error'); return; }
    useTradingStore.setState((state) => {
      const current = { ...(state.balances[userId] ?? { USDT: 0 }) };
      current[coin.symbol] = (current[coin.symbol] ?? 0) - total;
      return { balances: { ...state.balances, [userId]: current } };
    });
    addWithdraw(userId, coin.symbol, amt, usd, `To ${address.slice(0, 8)}…${address.slice(-6)} · fee ${fee} ${coin.symbol}`);
    toast(`Withdrawal of ${amt} ${coin.symbol} submitted`, 'success');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Withdraw" maxWidth="max-w-lg">
      <p className="text-text-tertiary text-sm mb-4">
        Send any supported coin to an external wallet. Pick a coin from the full list,
        enter the destination address and the amount you want to send. The network
        fee is deducted from your available balance along with the amount.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block">
            <span className="label">Search supported coins</span>
            <input className="input mt-1" placeholder="BTC, USDT, Solana…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="card mt-2 max-h-60 overflow-y-auto">
            <ul>
              {filtered.map((c) => (
                <li key={c.symbol}>
                  <button
                    onClick={() => setSymbol(c.symbol)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${c.symbol === symbol ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary'}`}
                  >
                    <CoinIcon symbol={c.symbol} size={22} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name} <span className="text-text-tertiary text-xs uppercase">{c.symbol}</span></p>
                      <p className="text-text-tertiary text-[11px] truncate">{c.network} · min {c.minWithdraw}</p>
                    </div>
                    <span className="text-text-secondary text-xs tabular-nums">
                      {formatNumber(useTradingStore.getState().balances[userId]?.[c.symbol] ?? 0, { notation: 'compact' })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          {coin && (
            <>
              <div className="card p-3 mb-3 flex items-center gap-2">
                <CoinIcon symbol={coin.symbol} size={28} />
                <div>
                  <p className="font-semibold">{coin.name} <span className="text-text-tertiary text-xs uppercase">{coin.symbol}</span></p>
                  <p className="text-text-tertiary text-[11px]">{coin.network}</p>
                </div>
                <div className="flex-1" />
                <div className="text-right">
                  <p className="text-text-tertiary text-[10px] uppercase">Available</p>
                  <p className="text-sm font-semibold tabular-nums">{balance.toFixed(coin.decimals)}</p>
                </div>
              </div>

              <label className="block mb-3">
                <span className="label">Destination address</span>
                <input className="input mt-1 font-mono text-xs" placeholder="Paste the recipient's address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>

              <label className="block mb-3">
                <span className="label">Amount ({coin.symbol})</span>
                <div className="flex gap-2 mt-1">
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  />
                  <button type="button" onClick={setMax} className="btn-ghost text-xs">MAX</button>
                </div>
              </label>

              <div className="text-xs space-y-1 mb-3">
                <div className="flex justify-between text-text-tertiary"><span>Amount</span><span className="tabular-nums text-text-secondary">{amt.toFixed(coin.decimals)} {coin.symbol}</span></div>
                <div className="flex justify-between text-text-tertiary"><span>Network fee</span><span className="tabular-nums text-text-secondary">{fee} {coin.symbol}</span></div>
                <div className="flex justify-between text-text-tertiary"><span>≈ USD</span><span className="tabular-nums text-text-secondary">{formatCurrency(usd)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total deducted</span><span className="tabular-nums">{total.toFixed(coin.decimals)} {coin.symbol}</span></div>
              </div>

              {insufficient && <p className="text-down text-xs mb-2">Insufficient balance.</p>}
              {belowMin && amt > 0 && <p className="text-down text-xs mb-2">Below the {coin.minWithdraw} {coin.symbol} minimum.</p>}

              <button onClick={submit} disabled={insufficient || belowMin || amt <= 0 || !address} className="btn-primary w-full text-sm">
                Withdraw {coin.symbol}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
