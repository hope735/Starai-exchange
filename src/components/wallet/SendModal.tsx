import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTradingStore } from '../../store/tradingStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useMarketStore } from '../../store/marketStore';
import { useWalletStore } from '../../store/walletStore';
import Modal from '../ui/Modal';
import { formatCurrency } from '../../lib/format';
import { toast } from '../ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  initialSymbol?: string;
}

export default function SendModal({ open, onClose, initialSymbol = 'BTC' }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? 'default');
  const listCoins = useWalletStore((s) => s.listCoins);
  const getCoin = useWalletStore((s) => s.getCoin);
  const getAddress = useWalletStore((s) => s.getAddress);
  const coins = useMarketStore((s) => s.coins);
  const addWithdraw = useTransactionStore((s) => s.addWithdraw);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setSymbol(initialSymbol);
      setAddress('');
      setAmount('');
      setNote('');
    }
  }, [open, initialSymbol]);

  const supported = listCoins();
  const coin = getCoin(symbol);
  const balance = useTradingStore.getState().balances[userId]?.[symbol] ?? 0;
  const myAddr = coin ? getAddress(userId, coin.symbol) : '';
  const amt = Number(amount) || 0;
  const fee = coin ? coin.fee : 0;
  const total = amt + fee;
  const insufficient = total > balance;
  const belowMin = coin ? amt < coin.minWithdraw : false;
  const usd = amt * (coins.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase())?.current_price ?? (symbol === 'USDT' || symbol === 'USDC' ? 1 : 0));
  const isSelf = !!(address && myAddr && address === myAddr);

  function setMax() {
    if (!coin) return;
    const usable = Math.max(0, balance - fee);
    setAmount(usable > 0 ? usable.toFixed(coin.decimals) : '0');
  }

  function submit() {
    if (!coin) return;
    if (!address || address.length < 8) { toast('Enter a valid destination address', 'error'); return; }
    if (isSelf) { toast('You cannot send to your own address', 'error'); return; }
    if (!Number.isFinite(amt) || amt <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (insufficient) { toast('Insufficient balance', 'error'); return; }
    if (belowMin) { toast(`Minimum send is ${coin.minWithdraw} ${coin.symbol}`, 'error'); return; }
    useTradingStore.setState((state) => {
      const current = { ...(state.balances[userId] ?? { USDT: 0 }) };
      current[coin.symbol] = (current[coin.symbol] ?? 0) - total;
      return { balances: { ...state.balances, [userId]: current } };
    });
    addWithdraw(userId, coin.symbol, amt, usd, `Send to ${address.slice(0, 10)}…${address.slice(-6)}${note ? ' · ' + note : ''}`);
    toast(`${amt} ${coin.symbol} sent successfully`, 'success');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Send crypto">
      <p className="text-text-tertiary text-sm mb-4">
        Send any supported coin to another wallet. The network fee is deducted from
        your available balance along with the amount you send.
      </p>

      <label className="block mb-3">
        <span className="label">Asset</span>
        <select className="input mt-1" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {supported.map((c) => (
            <option key={c.symbol} value={c.symbol}>
              {c.name} ({c.symbol}) · {c.network}
            </option>
          ))}
        </select>
      </label>

      <label className="block mb-3">
        <span className="label">Recipient address</span>
        <div className="flex gap-2 mt-1">
          <input
            className="input font-mono text-xs"
            placeholder="0x… / bc1q… / r… / T… / D… / ltc1q…"
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
          />
          <button
            type="button"
            onClick={() => setAddress(myAddr)}
            className="btn-ghost text-xs shrink-0"
          >
            My address
          </button>
        </div>
        {isSelf && <p className="text-xs text-down mt-1">That is your own address.</p>}
      </label>

      <label className="block mb-3">
        <span className="label">Amount ({coin?.symbol})</span>
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
        <p className="text-text-tertiary text-xs mt-1">
          Available: <b>{balance.toFixed(coin?.decimals ?? 6)} {coin?.symbol}</b>
        </p>
      </label>

      <label className="block mb-3">
        <span className="label">Memo (optional)</span>
        <input className="input mt-1" placeholder="e.g. invoice #1234" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {coin && (
        <div className="text-xs space-y-1 mb-3">
          <div className="flex justify-between text-text-tertiary"><span>Network fee</span><span className="tabular-nums text-text-secondary">{fee} {coin.symbol}</span></div>
          <div className="flex justify-between text-text-tertiary"><span>≈ USD</span><span className="tabular-nums text-text-secondary">{formatCurrency(usd)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular-nums">{total.toFixed(coin.decimals)} {coin.symbol}</span></div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={!coin || insufficient || belowMin || amt <= 0 || !address || isSelf}
        className="btn-primary w-full text-sm"
      >
        Send {coin?.symbol ?? ''}
      </button>
    </Modal>
  );
}
