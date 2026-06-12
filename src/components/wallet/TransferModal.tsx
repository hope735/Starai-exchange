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

type Direction = 'internal' | 'external';

export default function TransferModal({ open, onClose, initialSymbol = 'USDT' }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? 'default');
  const listCoins = useWalletStore((s) => s.listCoins);
  const getCoin = useWalletStore((s) => s.getCoin);
  const getAddress = useWalletStore((s) => s.getAddress);
  const coins = useMarketStore((s) => s.coins);
  const balances = useTradingStore((s) => s.balances);
  const addWithdraw = useTransactionStore((s) => s.addWithdraw);
  const addDeposit = useTransactionStore((s) => s.addDeposit);

  const [direction, setDirection] = useState<Direction>('internal');
  const [symbol, setSymbol] = useState(initialSymbol);
  const [source, setSource] = useState<'spot' | 'funding'>('spot');
  const [dest, setDest] = useState<'spot' | 'funding'>('funding');
  const [externalAddress, setExternalAddress] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open) {
      setDirection('internal');
      setSymbol(initialSymbol);
      setSource('spot');
      setDest('funding');
      setExternalAddress('');
      setAmount('');
    }
  }, [open, initialSymbol]);

  const supported = listCoins();
  const coin = getCoin(symbol);
  const balance = balances[userId]?.[symbol] ?? 0;
  const amt = Number(amount) || 0;
  const fee = direction === 'external' && coin ? coin.fee : 0;
  const total = amt + fee;
  const insufficient = total > balance;
  const belowMin = direction === 'external' && coin ? amt < coin.minWithdraw : false;
  const price = coins.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase())?.current_price ?? (symbol === 'USDT' || symbol === 'USDC' ? 1 : 0);
  const usd = amt * price;

  function setMax() {
    if (!coin) return;
    const usable = Math.max(0, balance - fee);
    setAmount(usable > 0 ? usable.toFixed(coin.decimals) : '0');
  }

  function submit() {
    if (!coin) return;
    if (!Number.isFinite(amt) || amt <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (insufficient) { toast('Insufficient balance', 'error'); return; }
    if (direction === 'external' && belowMin) { toast(`Minimum external transfer is ${coin.minWithdraw} ${coin.symbol}`, 'error'); return; }
    if (direction === 'external' && (!externalAddress || externalAddress.length < 8)) { toast('Enter a valid destination address', 'error'); return; }
    if (direction === 'external' && externalAddress === getAddress(userId, coin.symbol)) { toast('You cannot transfer to your own address', 'error'); return; }

    // Deduct from source
    useTradingStore.setState((state) => {
      const current = { ...(state.balances[userId] ?? { USDT: 0 }) };
      current[coin.symbol] = (current[coin.symbol] ?? 0) - total;
      return { balances: { ...state.balances, [userId]: current } };
    });

    if (direction === 'internal') {
      // No network fee, instant internal credit back to user.
      useTradingStore.setState((state) => {
        const current = { ...(state.balances[userId] ?? { USDT: 0 }) };
        current[coin.symbol] = (current[coin.symbol] ?? 0) + amt;
        return { balances: { ...state.balances, [userId]: current } };
      });
      addDeposit(userId, coin.symbol, amt, usd);
      useTransactionStore.getState().addTransaction(userId, { kind: 'trade', asset: coin.symbol, amount: 0, valueUsd: 0, note: `Internal transfer ${source} → ${dest}` });
      toast(`Transferred ${amt} ${coin.symbol} from ${source} to ${dest}`, 'success');
    } else {
      addWithdraw(userId, coin.symbol, amt, usd, `External transfer to ${externalAddress.slice(0, 10)}…${externalAddress.slice(-6)} · fee ${fee} ${coin.symbol}`);
      toast(`External transfer of ${amt} ${coin.symbol} submitted`, 'success');
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Transfer" maxWidth="max-w-lg">
      <p className="text-text-tertiary text-sm mb-4">
        Move funds between your Spot and Funding wallets instantly, or send to an
        external address. Internal transfers have no fees; external transfers
        incur the standard network fee.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setDirection('internal')}
          className={`card p-3 text-left ${direction === 'internal' ? 'ring-2 ring-brand-gold' : ''}`}
        >
          <p className="font-semibold text-sm">Internal transfer</p>
          <p className="text-text-tertiary text-[11px]">Between your wallets · free · instant</p>
        </button>
        <button
          onClick={() => setDirection('external')}
          className={`card p-3 text-left ${direction === 'external' ? 'ring-2 ring-brand-gold' : ''}`}
        >
          <p className="font-semibold text-sm">External transfer</p>
          <p className="text-text-tertiary text-[11px]">To another wallet · network fee</p>
        </button>
      </div>

      <label className="block mb-3">
        <span className="label">Asset</span>
        <select className="input mt-1" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {supported.map((c) => (
            <option key={c.symbol} value={c.symbol}>{c.name} ({c.symbol})</option>
          ))}
        </select>
      </label>

      {direction === 'internal' ? (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="label">From</span>
            <select className="input mt-1" value={source} onChange={(e) => setSource(e.target.value as 'spot' | 'funding')}>
              <option value="spot">Spot wallet</option>
              <option value="funding">Funding wallet</option>
            </select>
          </label>
          <label className="block">
            <span className="label">To</span>
            <select className="input mt-1" value={dest} onChange={(e) => setDest(e.target.value as 'spot' | 'funding')}>
              <option value="spot">Spot wallet</option>
              <option value="funding">Funding wallet</option>
            </select>
          </label>
        </div>
      ) : (
        <label className="block mb-3">
          <span className="label">Destination address</span>
          <input
            className="input mt-1 font-mono text-xs"
            placeholder="Paste the recipient's address"
            value={externalAddress}
            onChange={(e) => setExternalAddress(e.target.value.trim())}
          />
        </label>
      )}

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

      {coin && (
        <div className="text-xs space-y-1 mb-3">
          <div className="flex justify-between text-text-tertiary"><span>Amount</span><span className="tabular-nums text-text-secondary">{amt.toFixed(coin.decimals)} {coin.symbol}</span></div>
          <div className="flex justify-between text-text-tertiary"><span>Network fee</span><span className="tabular-nums text-text-secondary">{fee} {coin.symbol}</span></div>
          <div className="flex justify-between text-text-tertiary"><span>≈ USD</span><span className="tabular-nums text-text-secondary">{formatCurrency(usd)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total deducted</span><span className="tabular-nums">{total.toFixed(coin.decimals)} {coin.symbol}</span></div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={!coin || insufficient || amt <= 0 || (direction === 'external' && (!externalAddress || belowMin))}
        className="btn-primary w-full text-sm"
      >
        {direction === 'internal' ? 'Transfer between wallets' : `Send ${coin?.symbol ?? ''} externally`}
      </button>
    </Modal>
  );
}
