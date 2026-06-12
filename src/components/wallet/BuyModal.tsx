import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTradingStore } from '../../store/tradingStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useMarketStore } from '../../store/marketStore';
import { useWalletStore } from '../../store/walletStore';
import Modal from '../ui/Modal';
import { formatCurrency } from '../../lib/format';
import { toast } from '../ui/Toast';

interface PaymentMethod {
  id: string;
  name: string;
  brand: string;
  icon: string;
  type: 'card' | 'wallet';
  feePct: number;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'mastercard', name: 'Mastercard', brand: '#eb001b', icon: 'M', type: 'card', feePct: 1.8 },
  { id: 'visa', name: 'Visa', brand: '#1a1f71', icon: 'V', type: 'card', feePct: 1.8 },
  { id: 'amex', name: 'American Express', brand: '#2e77bb', icon: 'A', type: 'card', feePct: 2.2 },
  { id: 'discover', name: 'Discover', brand: '#ff6000', icon: 'D', type: 'card', feePct: 2.0 },
  { id: 'paypal', name: 'PayPal', brand: '#003087', icon: 'P', type: 'wallet', feePct: 2.5 },
  { id: 'cashapp', name: 'Cash App', brand: '#00d64b', icon: '$', type: 'wallet', feePct: 1.5 },
  { id: 'applepay', name: 'Apple Pay', brand: '#000000', icon: '', type: 'wallet', feePct: 1.5 },
  { id: 'googlepay', name: 'Google Pay', brand: '#4285f4', icon: 'G', type: 'wallet', feePct: 1.5 },
  { id: 'venmo', name: 'Venmo', brand: '#3d95ce', icon: 'V', type: 'wallet', feePct: 2.0 },
  { id: 'bank', name: 'Bank transfer (ACH/SEPA)', brand: '#16c784', icon: 'B', type: 'wallet', feePct: 0.4 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  initialSymbol?: string;
}

export default function BuyModal({ open, onClose, initialSymbol = 'USDT' }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? 'default');
  const listCoins = useWalletStore((s) => s.listCoins);
  const getCoin = useWalletStore((s) => s.getCoin);
  const coins = useMarketStore((s) => s.coins);
  const addDeposit = useTransactionStore((s) => s.addDeposit);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [usd, setUsd] = useState('100');
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [step, setStep] = useState<'choose' | 'pay'>('choose');
  const [submitting, setSubmitting] = useState(false);
  const [card, setCard] = useState({ name: '', number: '', exp: '', cvc: '' });
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (open) {
      setSymbol(initialSymbol);
      setUsd('100');
      setMethod(PAYMENT_METHODS[0]);
      setStep('choose');
      setSubmitting(false);
      setCard({ name: '', number: '', exp: '', cvc: '' });
      setEmail('');
    }
  }, [open, initialSymbol]);

  const coin = getCoin(symbol);
  const supported = listCoins();
  const usdNum = Number(usd) || 0;
  const fee = usdNum * (method.feePct / 100);
  const totalUsd = usdNum + fee;
  const price = coins.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase())?.current_price ?? (symbol === 'USDT' || symbol === 'USDC' ? 1 : 0);
  const coinAmount = coin && usdNum > 0 && price > 0 ? usdNum / price : 0;

  function luhn(num: string): boolean {
    const s = num.replace(/\D/g, '');
    if (s.length < 12) return false;
    let sum = 0;
    let alt = false;
    for (let i = s.length - 1; i >= 0; i -= 1) {
      let n = s.charCodeAt(i) - 48;
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function pay() {
    if (usdNum < 10) { toast('Minimum purchase is $10', 'error'); return; }
    if (usdNum > 50000) { toast('Maximum purchase is $50,000 per transaction', 'error'); return; }
    if (method.type === 'card') {
      if (!card.name.trim()) { toast('Cardholder name is required', 'error'); return; }
      if (!luhn(card.number)) { toast('Invalid card number', 'error'); return; }
      if (!/^\d{2}\/\d{2}$/.test(card.exp)) { toast('Expiry must be MM/YY', 'error'); return; }
      if (!/^\d{3,4}$/.test(card.cvc)) { toast('Invalid CVC', 'error'); return; }
    } else {
      if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Enter a valid email for the wallet', 'error'); return; }
    }
    setSubmitting(true);
    window.setTimeout(() => {
      const current = useTradingStore.getState().balances[userId] ?? { USDT: 0 };
      useTradingStore.setState((state) => ({
        balances: { ...state.balances, [userId]: { ...current, [coin!.symbol]: (current[coin!.symbol] ?? 0) + coinAmount } },
      }));
      addDeposit(userId, coin!.symbol, coinAmount, usdNum);
      toast(`Purchased ${coinAmount.toFixed(coin!.decimals)} ${coin!.symbol} via ${method.name}`, 'success');
      setSubmitting(false);
      onClose();
    }, 900);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Buy crypto · ${method.name}`} maxWidth="max-w-2xl">
      {step === 'choose' && (
        <>
          <p className="text-text-tertiary text-sm mb-4">
            Choose the coin you want to buy and how much you want to spend. Funds are
            credited to your wallet instantly after the payment is confirmed.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Asset to receive</span>
              <select className="input mt-1" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                {supported.map((c) => (
                  <option key={c.symbol} value={c.symbol}>{c.name} ({c.symbol})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Amount in USD</span>
              <input
                className="input mt-1"
                inputMode="decimal"
                value={usd}
                onChange={(e) => setUsd(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="100"
              />
            </label>
          </div>

          {coin && (
            <p className="text-sm text-text-secondary mt-2">
              You will receive ≈{' '}
              <b className="text-brand-gold tabular-nums">{coinAmount.toFixed(coin.decimals)} {coin.symbol}</b>{' '}
              <span className="text-text-tertiary">at the current market price.</span>
            </p>
          )}

          <p className="label mt-4 mb-2">Choose a payment method</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m)}
                className={`card p-3 text-left transition-colors hover:bg-bg-tertiary ${method.id === m.id ? 'ring-2 ring-brand-gold' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-md text-white font-bold flex items-center justify-center text-sm"
                    style={{ background: m.brand }}
                  >
                    {m.icon || '●'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{m.name}</p>
                    <p className="text-text-tertiary text-[11px]">{m.feePct.toFixed(1)}% fee</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 card p-3 text-xs space-y-1">
            <div className="flex justify-between text-text-tertiary"><span>Subtotal</span><span className="tabular-nums text-text-secondary">{formatCurrency(usdNum)}</span></div>
            <div className="flex justify-between text-text-tertiary"><span>Processing fee ({method.feePct}%)</span><span className="tabular-nums text-text-secondary">{formatCurrency(fee)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular-nums">{formatCurrency(totalUsd)}</span></div>
          </div>

          <button onClick={() => setStep('pay')} disabled={usdNum < 10 || !coin} className="btn-primary w-full text-sm mt-4">
            Continue to {method.name}
          </button>
        </>
      )}

      {step === 'pay' && coin && (
        <>
          <p className="text-text-tertiary text-sm mb-4">
            Pay <b>{formatCurrency(totalUsd)}</b> via {method.name} to fund your wallet
            with <b className="text-brand-gold">{coinAmount.toFixed(coin.decimals)} {coin.symbol}</b>.
          </p>

          {method.type === 'card' ? (
            <div className="space-y-3">
              <label className="block">
                <span className="label">Cardholder name</span>
                <input className="input mt-1" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="Full name on card" />
              </label>
              <label className="block">
                <span className="label">Card number</span>
                <input
                  className="input mt-1 tabular-nums"
                  inputMode="numeric"
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, '').slice(0, 19) })}
                  placeholder="4242 4242 4242 4242"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Expiry (MM/YY)</span>
                  <input className="input mt-1" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value.slice(0, 5) })} placeholder="12/29" />
                </label>
                <label className="block">
                  <span className="label">CVC</span>
                  <input className="input mt-1 tabular-nums" inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="123" />
                </label>
              </div>
            </div>
          ) : (
            <label className="block">
              <span className="label">{method.name} email</span>
              <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <p className="text-text-tertiary text-xs mt-1">
                We will send a secure checkout link to this email to authorize the payment.
              </p>
            </label>
          )}

          <div className="mt-4 card p-3 text-xs space-y-1">
            <div className="flex justify-between text-text-tertiary"><span>Pay</span><span className="tabular-nums font-semibold text-text-primary">{formatCurrency(totalUsd)}</span></div>
            <div className="flex justify-between text-text-tertiary"><span>Receive</span><span className="tabular-nums font-semibold text-up">{coinAmount.toFixed(coin.decimals)} {coin.symbol}</span></div>
            <div className="flex justify-between text-text-tertiary"><span>Method</span><span>{method.name}</span></div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={() => setStep('choose')} className="btn-outline text-sm flex-1" disabled={submitting}>
              Back
            </button>
            <button onClick={pay} disabled={submitting} className="btn-primary text-sm flex-1">
              {submitting ? 'Processing…' : `Pay ${formatCurrency(totalUsd)}`}
            </button>
          </div>
          <p className="text-[11px] text-text-tertiary mt-2 text-center">
            Secured by 256-bit TLS. PCI-DSS compliant processing.
          </p>
        </>
      )}
    </Modal>
  );
}
