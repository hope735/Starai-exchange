import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTradingStore } from '../store/tradingStore';
import { useMarketStore } from '../store/marketStore';
import { useTransactionStore, type Transaction } from '../store/transactionStore';
import { useWalletStore } from '../store/walletStore';
import CoinIcon from '../components/ui/CoinIcon';
import ChangeCell from '../components/ui/ChangeCell';
import { formatCurrency } from '../lib/format';
import { toast } from '../components/ui/Toast';
import QuickActionsBar from '../components/wallet/QuickActions';
import ReceiveModal from '../components/wallet/ReceiveModal';
import SendModal from '../components/wallet/SendModal';
import BuyModal from '../components/wallet/BuyModal';
import TransferModal from '../components/wallet/TransferModal';
import DepositModal from '../components/wallet/DepositModal';
import WithdrawModal from '../components/wallet/WithdrawModal';
import type { Asset } from '../types';

export default function Wallet() {
  const user = useAuthStore((s) => s.user);
  const balances = useTradingStore((s) => s.balances);
  const reset = useTradingStore((s) => s.resetForUser);
  const coins = useMarketStore((s) => s.coins);
  const transactions = useTransactionStore((s) => s.transactions);
  const clearTransactions = useTransactionStore((s) => s.clearForUser);
  const getAddress = useWalletStore((s) => s.getAddress);

  const [hideZero, setHideZero] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | Transaction['kind']>('all');
  const [activeModal, setActiveModal] = useState<'receive' | 'send' | 'buy' | 'transfer' | 'deposit' | 'withdraw' | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<string>('BTC');

  const userId = user?.id ?? 'default';
  const userBalances = balances[userId] ?? { USDT: 0 };
  const myTx = transactions[userId] ?? [];

  const assets: Asset[] = useMemo(() => {
    return Object.entries(userBalances)
      .map(([symbol, balance]) => {
        const coin = coins.find((c) => c.symbol.toUpperCase() === symbol);
        const price = symbol === 'USDT' || symbol === 'USDC' ? 1 : coin?.current_price ?? 0;
        const change = coin?.price_change_percentage_24h ?? 0;
        return {
          symbol,
          name: coin?.name ?? symbol,
          balance,
          price,
          value: balance * price,
          change24h: change,
          icon: coin?.image,
        } as Asset;
      })
      .filter((a) => (hideZero ? a.balance > 0 : true))
      .sort((a, b) => b.value - a.value);
  }, [userBalances, coins, hideZero]);

  const totalValue = assets.reduce((acc, a) => acc + a.value, 0);
  const stableValue = assets.filter((a) => a.symbol === 'USDT' || a.symbol === 'USDC').reduce((acc, a) => acc + a.value, 0);

  const filteredTx = txFilter === 'all' ? myTx : myTx.filter((t) => t.kind === txFilter);

  function openAction(modal: typeof activeModal, symbol = 'BTC') {
    setActiveSymbol(symbol);
    setActiveModal(modal);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="text-text-tertiary text-sm">
            Manage your crypto balances, deposit, withdraw, buy and transfer in real time.
          </p>
        </div>
      </header>

      {/* Quick action buttons */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Quick actions</h2>
        <QuickActionsBar defaultSymbol="BTC" />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="label">Total balance</p>
          <p className="stat mt-1">{formatCurrency(totalValue)}</p>
        </div>
        <div className="card p-4">
          <p className="label">Stablecoins</p>
          <p className="stat mt-1">{formatCurrency(stableValue)}</p>
        </div>
        <div className="card p-4">
          <p className="label">Asset count</p>
          <p className="stat mt-1">{assets.filter((a) => a.balance > 0).length}</p>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-border">
          <h2 className="font-semibold">Assets</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-text-tertiary flex items-center gap-2">
              <input
                type="checkbox"
                checked={hideZero}
                onChange={(e) => setHideZero(e.target.checked)}
              />
              Hide zero balances
            </label>
            <button
              onClick={() => {
                if (window.confirm('Reset balances to the default portfolio?')) {
                  reset();
                  toast('Balances reset to defaults', 'success');
                }
              }}
              className="btn-ghost text-xs"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-text-tertiary">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left">Asset</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-right">24h</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.symbol} className="border-b border-border/60">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={a.symbol} image={a.icon} size={24} />
                      <div>
                        <p className="font-medium">{a.name}</p>
                        <p className="text-text-tertiary text-xs uppercase">{a.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(a.price)}</td>
                  <td className="px-3 py-2 text-right">
                    <ChangeCell value={a.change24h} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.balance.toFixed(6)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {formatCurrency(a.value)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1 flex-wrap justify-end">
                      <button
                        onClick={() => openAction('deposit', a.symbol)}
                        className="btn-ghost px-2 py-1 text-[11px]"
                      >
                        Deposit
                      </button>
                      <button
                        onClick={() => openAction('withdraw', a.symbol)}
                        className="btn-ghost px-2 py-1 text-[11px]"
                      >
                        Withdraw
                      </button>
                      <button
                        onClick={() => openAction('send', a.symbol)}
                        className="btn-ghost px-2 py-1 text-[11px]"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => openAction('receive', a.symbol)}
                        className="btn-ghost px-2 py-1 text-[11px]"
                      >
                        Receive
                      </button>
                      <Link
                        to={`/trade/${a.symbol === 'USDT' || a.symbol === 'USDC' ? 'BTC' : a.symbol}USDT`}
                        className="btn-ghost px-2 py-1 text-[11px]"
                      >
                        Trade
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-text-tertiary">
                    No assets yet. Use the quick actions above to receive, buy or transfer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-border">
          <h2 className="font-semibold">Transaction history</h2>
          <div className="flex flex-wrap items-center gap-1">
            {(['all', 'deposit', 'withdraw', 'trade', 'fee'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTxFilter(k)}
                className={`text-[11px] uppercase px-2 py-1 rounded border ${
                  txFilter === k
                    ? 'border-brand-gold/60 text-brand-gold bg-brand-gold/10'
                    : 'border-border text-text-tertiary hover:text-text-primary'
                }`}
              >
                {k}
              </button>
            ))}
            {myTx.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear your transaction history?')) {
                    clearTransactions(userId);
                    toast('Transaction history cleared', 'info');
                  }
                }}
                className="text-[11px] text-text-tertiary hover:text-text-primary ml-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-text-tertiary">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Asset</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Value (USD)</th>
                <th className="px-3 py-2 text-left">Note</th>
                <th className="px-3 py-2 text-left">When</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map((t) => {
                const isCredit = t.kind === 'deposit' || (t.kind === 'trade' && t.amount > 0);
                const isDebit = t.kind === 'withdraw' || (t.kind === 'trade' && t.amount < 0);
                const color = isCredit ? 'text-up' : isDebit ? 'text-down' : 'text-text-secondary';
                return (
                  <tr key={t.id} className="border-b border-border/60">
                    <td className="px-3 py-2">
                      <span className={`pill capitalize ${color}`}>{t.kind}</span>
                    </td>
                    <td className="px-3 py-2 font-medium">{t.asset}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${color}`}>
                      {t.amount > 0 ? '+' : ''}
                      {t.amount.toFixed(t.amount < 1 ? 6 : 4)} {t.asset}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {t.valueUsd !== undefined ? formatCurrency(t.valueUsd) : '—'}
                    </td>
                    <td className="px-3 py-2 text-text-secondary text-xs">{t.note ?? '—'}</td>
                    <td className="px-3 py-2 text-text-tertiary text-xs">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {filteredTx.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-text-tertiary">
                    No transactions yet. Try a deposit, buy or place a trade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      <ReceiveModal
        open={activeModal === 'receive'}
        onClose={() => setActiveModal(null)}
        initialSymbol={activeSymbol}
      />
      <SendModal
        open={activeModal === 'send'}
        onClose={() => setActiveModal(null)}
        initialSymbol={activeSymbol}
      />
      <BuyModal
        open={activeModal === 'buy'}
        onClose={() => setActiveModal(null)}
        initialSymbol={activeSymbol}
      />
      <TransferModal
        open={activeModal === 'transfer'}
        onClose={() => setActiveModal(null)}
        initialSymbol={activeSymbol}
      />
      <DepositModal
        open={activeModal === 'deposit'}
        onClose={() => setActiveModal(null)}
        initialSymbol={activeSymbol}
      />
      <WithdrawModal
        open={activeModal === 'withdraw'}
        onClose={() => setActiveModal(null)}
        initialSymbol={activeSymbol}
      />
    </div>
  );
}
