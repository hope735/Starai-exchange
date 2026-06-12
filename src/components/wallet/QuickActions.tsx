// QuickActionsBar — shows the four primary wallet actions (Receive /
// Send / Buy / Transfer) and opens the corresponding modal. Designed
// to sit at the top of the Wallet page and as a quick action bar in
// the Dashboard.

import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import ReceiveModal from './ReceiveModal';
import SendModal from './SendModal';
import BuyModal from './BuyModal';
import TransferModal from './TransferModal';

type Action = 'receive' | 'send' | 'buy' | 'transfer' | null;

export default function QuickActionsBar({ defaultSymbol = 'BTC' }: { defaultSymbol?: string }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [action, setAction] = useState<Action>(null);
  const [symbol, setSymbol] = useState(defaultSymbol);

  if (!isAuth) {
    return (
      <div className="card p-4 text-center text-text-tertiary text-sm">
        Log in to send, receive, buy and transfer crypto.
      </div>
    );
  }

  return (
    <>
      <div className="card p-2 grid grid-cols-4 gap-1">
        <button
          onClick={() => { setSymbol(defaultSymbol); setAction('receive'); }}
          className="flex flex-col items-center gap-1 p-3 rounded-md hover:bg-bg-tertiary"
        >
          <span className="w-9 h-9 rounded-full bg-up/15 text-up flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </span>
          <span className="text-xs">Receive</span>
        </button>
        <button
          onClick={() => { setSymbol(defaultSymbol); setAction('send'); }}
          className="flex flex-col items-center gap-1 p-3 rounded-md hover:bg-bg-tertiary"
        >
          <span className="w-9 h-9 rounded-full bg-down/15 text-down flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="19 12 12 5 5 12" />
            </svg>
          </span>
          <span className="text-xs">Send</span>
        </button>
        <button
          onClick={() => { setSymbol('USDT'); setAction('buy'); }}
          className="flex flex-col items-center gap-1 p-3 rounded-md hover:bg-bg-tertiary"
        >
          <span className="w-9 h-9 rounded-full bg-brand-gold/15 text-brand-gold flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </span>
          <span className="text-xs">Buy</span>
        </button>
        <button
          onClick={() => { setSymbol(defaultSymbol); setAction('transfer'); }}
          className="flex flex-col items-center gap-1 p-3 rounded-md hover:bg-bg-tertiary"
        >
          <span className="w-9 h-9 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </span>
          <span className="text-xs">Transfer</span>
        </button>
      </div>

      <ReceiveModal open={action === 'receive'} onClose={() => setAction(null)} initialSymbol={symbol} />
      <SendModal open={action === 'send'} onClose={() => setAction(null)} initialSymbol={symbol} />
      <BuyModal open={action === 'buy'} onClose={() => setAction(null)} initialSymbol={symbol} />
      <TransferModal open={action === 'transfer'} onClose={() => setAction(null)} initialSymbol={symbol} />
    </>
  );
}
