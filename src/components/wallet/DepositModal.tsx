import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTradingStore } from '../../store/tradingStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useMarketStore } from '../../store/marketStore';
import { useWalletStore } from '../../store/walletStore';
import Modal from '../ui/Modal';
import QRCode from '../ui/QRCode';
import { formatCurrency } from '../../lib/format';
import { toast } from '../ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  initialSymbol?: string;
}

export default function DepositModal({ open, onClose, initialSymbol = 'USDT' }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? 'default');
  const listCoins = useWalletStore((s) => s.listCoins);
  const getAddress = useWalletStore((s) => s.getAddress);
  const getCoin = useWalletStore((s) => s.getCoin);
  const coins = useMarketStore((s) => s.coins);
  const addDeposit = useTransactionStore((s) => s.addDeposit);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open) {
      setSymbol(initialSymbol);
      setAmount('');
    }
  }, [open, initialSymbol]);

  const supported = listCoins();
  const coin = getCoin(symbol);
  const address = useMemo(() => (coin ? getAddress(userId, coin.symbol) : ''), [coin, userId, getAddress]);
  const price = coins.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase())?.current_price ?? (symbol === 'USDT' || symbol === 'USDC' ? 1 : 0);
  const usd = Number(amount) > 0 ? Number(amount) * price : 0;
  const minOk = coin ? Number(amount) >= coin.minDeposit : true;

  function confirm() {
    if (!coin) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (n < coin.minDeposit) { toast(`Minimum deposit is ${coin.minDeposit} ${coin.symbol}`, 'error'); return; }
    useTradingStore.setState((state) => {
      const current = { ...(state.balances[userId] ?? { USDT: 0 }) };
      current[coin.symbol] = (current[coin.symbol] ?? 0) + n;
      return { balances: { ...state.balances, [userId]: current } };
    });
    addDeposit(userId, coin.symbol, n, usd);
    toast(`${n} ${coin.symbol} credited to your wallet`, 'success');
    setAmount('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Deposit">
      <p className="text-text-tertiary text-sm mb-4">
        Send funds from an external wallet or exchange to your unique deposit address below.
        Your balance updates automatically once the network confirms the transfer.
      </p>
      <label className="block mb-3">
        <span className="label">Asset</span>
        <select className="input mt-1" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {supported.map((c) => (
            <option key={c.symbol} value={c.symbol}>{c.name} ({c.symbol}) · {c.network}</option>
          ))}
        </select>
      </label>

      {coin && (
        <>
          <div className="flex flex-col items-center bg-white p-3 rounded-lg my-3">
            <QRCode value={address} size={176} bg="#ffffff" fg="#0b0e11" />
          </div>
          <div className="card p-3 mb-3">
            <p className="label">Deposit address ({coin.network})</p>
            <p className="font-mono text-xs break-all text-text-primary mt-1">{address}</p>
            <button
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(address);
                  toast('Address copied', 'success');
                } catch { toast('Copy failed', 'error'); }
              }}
              className="text-brand-gold text-xs mt-2 hover:underline"
            >
              Copy address
            </button>
          </div>

          <label className="block mb-3">
            <span className="label">Amount you are sending ({coin.symbol})</span>
            <input
              className="input mt-1"
              inputMode="decimal"
              placeholder={`min ${coin.minDeposit}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            />
            <p className="text-text-tertiary text-xs mt-1">
              ≈ {formatCurrency(usd)} · network fee paid by sender
            </p>
          </label>

          <div className="flex flex-wrap gap-2">
            <button onClick={confirm} disabled={!minOk} className="btn-primary text-sm flex-1">
              I have sent the funds
            </button>
          </div>
          <p className="text-xs text-text-tertiary mt-3">
            Minimum: {coin.minDeposit} {coin.symbol}. Funds credit after network confirmation.
          </p>
        </>
      )}
    </Modal>
  );
}
