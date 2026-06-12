// AI-powered support chat. Provides a context-aware assistant that knows
// about the authenticated user, their balances, recent orders and the
// current top markets, so its answers are grounded in real data.

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTradingStore } from '../../store/tradingStore';
import { useMarketStore } from '../../store/marketStore';
import { generateId } from '../../lib/crypto';
import { formatCurrency, formatPercent } from '../../lib/format';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

type Intent =
  | 'greeting'
  | 'balance'
  | 'price'
  | 'orders'
  | 'kyc'
  | 'fees'
  | 'security'
  | 'reset'
  | 'help';

interface IntentRule {
  intent: Intent;
  patterns: RegExp[];
}

const RULES: IntentRule[] = [
  {
    intent: 'greeting',
    patterns: [/\b(hi|hello|hey|yo|good\s*(morning|afternoon|evening))\b/i],
  },
  {
    intent: 'balance',
    patterns: [/\b(balance|portfolio|how much (do i|do you)|total|holdings|wallet)\b/i],
  },
  {
    intent: 'price',
    patterns: [/\b(price|worth|value|rate|how much is|what is .* worth)\b/i],
  },
  {
    intent: 'orders',
    patterns: [/\b(order|orders|history|trades?|recent)\b/i],
  },
  {
    intent: 'kyc',
    patterns: [/\b(kyc|verify|verification|identity|id)\b/i],
  },
  {
    intent: 'fees',
    patterns: [/\b(fee|fees|commission|cost|charge)\b/i],
  },
  {
    intent: 'security',
    patterns: [/\b(security|2fa|two[- ]factor|safe|password)\b/i],
  },
  {
    intent: 'reset',
    patterns: [/\b(reset|clear|wipe|forget)\b/i],
  },
  {
    intent: 'help',
    patterns: [/\b(help|support|how|what can you|capabilities)\b/i],
  },
];

function classifyIntent(input: string): Intent {
  for (const rule of RULES) {
    for (const p of rule.patterns) {
      if (p.test(input)) return rule.intent;
    }
  }
  return 'help';
}

function extractSymbol(input: string, coins: { symbol: string; name: string; current_price: number }[]): string | null {
  const upper = input.toUpperCase();
  for (const c of coins) {
    if (upper.includes(c.symbol.toUpperCase())) return c.symbol.toUpperCase();
  }
  const lower = input.toLowerCase();
  for (const c of coins) {
    if (lower.includes(c.name.toLowerCase())) return c.symbol.toUpperCase();
  }
  return null;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeResponse(intent: Intent, raw: string): string {
  const user = useAuthStore.getState().user;
  const isAuth = useAuthStore.getState().isAuthenticated;
  const coins = useMarketStore.getState().coins;
  const balances = useTradingStore.getState().balances;
  const orders = useTradingStore.getState().orders;
  const userId = user?.id ?? 'default';
  const userBalances = balances[userId] ?? { USDT: 0 };

  switch (intent) {
    case 'greeting': {
      const greetings = [
        `Hey${user ? ` ${user.name.split(' ')[0]}` : ''}! I'm StarAI Assistant — what can I help with today?`,
        `Hi there${user ? `, ${user.name.split(' ')[0]}` : ''}. Ask me about prices, your wallet, or anything else.`,
        `Hello! Need help with trading, account, or markets? I'm here.`,
      ];
      return pick(greetings);
    }
    case 'balance': {
      if (!isAuth) {
        return 'You are not signed in. Create an account or log in to see your account balance.';

      }
      const totalValue = Object.entries(userBalances).reduce((acc, [sym, amt]) => {
        if (sym === 'USDT' || sym === 'USDC') return acc + (amt as number);
        const coin = coins.find((c) => c.symbol.toUpperCase() === sym);
        return acc + (coin ? coin.current_price * (amt as number) : 0);
      }, 0);
      const lines = Object.entries(userBalances)
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => `• ${k}: ${(v as number).toFixed(6)}`)
        .join('\n');
      return `Your portfolio is worth ${formatCurrency(totalValue)}.\n${lines || 'No balances yet.'}`;

    }
    case 'price': {
      const sym = extractSymbol(raw, coins);
      if (sym) {
        const coin = coins.find((c) => c.symbol.toUpperCase() === sym);
        if (coin) {
          return `${sym} is currently ${formatCurrency(coin.current_price)} (${formatPercent(coin.price_change_percentage_24h)} 24h). Market cap ${formatCurrency(coin.market_cap, 'USD', { notation: 'compact' })}.`;
        }
      }
      if (coins.length === 0) return 'I am still loading market data. Please try again in a moment.';
      const top = coins.slice(0, 3)
        .map((c) => `• ${c.symbol.toUpperCase()}: ${formatCurrency(c.current_price)} (${formatPercent(c.price_change_percentage_24h)})`)
        .join('\n');
      return `Here are the top markets right now:\n${top}\nAsk me about a specific coin (e.g. "what is ETH worth?").`;
    }
    case 'orders': {
      if (!isAuth) return 'Please log in to view your order history.';
      const my = orders[userId] ?? [];
      if (my.length === 0) return 'You have no orders yet. Visit the Trade page to place your first order.';
      const recent = my
        .slice(0, 5)
        .map((o) => `• ${o.side.toUpperCase()} ${o.amount.toFixed(6)} ${o.symbol} @ ${formatCurrency(o.price)} — ${new Date(o.filledAt ?? o.createdAt).toLocaleString()}`)
        .join('\n');
      return `Your last ${Math.min(5, my.length)} of ${my.length} order(s):\n${recent}`;
    }
    case 'kyc': {
      if (!user) return 'Sign in to start KYC verification.';
      if (user.kycStatus === 'verified') return 'You are already KYC verified — withdrawals are unlocked.';
      if (user.kycStatus === 'pending') return 'Your KYC submission is being reviewed. This usually takes less than 24 hours.';
      return 'To start KYC, go to Profile → Identity Verification and complete the form. In this demo, submissions move through unverified → pending → verified automatically.';
    }
    case 'fees': {
      return 'Spot trading fees on StarAI are 0.1% per executed order. There are no deposit fees. Withdrawals incur a small network fee that varies per asset.';
    }
    case 'security': {
      return 'To keep your account safe: (1) enable two-factor authentication from your profile, (2) use a strong unique password, (3) never share your password or 2FA codes, (4) always verify you are on the official StarAI domain.';

    }
    case 'reset': {
      return 'To reset your demo balances, open the Wallet page and click "Reset". Note that this is a demo and does not affect any real funds.';
    }
    case 'help':
    default: {
      return 'I can help with:\n• Your balance and portfolio\n• Live prices (e.g. "ETH price")\n• Recent orders\n• KYC / verification status\n• Fees and security tips\n• Resetting demo balances\n\nTry asking "what is my balance?" or "price of BTC".';
    }
  }
}

const SUGGESTED_PROMPTS = [
  'What is my balance?',
  'BTC price',
  'Show my last orders',
  'KYC status',
  'What are the fees?',
];

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      ts: Date.now(),
      text: "Hi! I'm StarAI Assistant. I can answer questions about your account, live prices, fees, and more. Try one of the suggestions below.",
    },
  ]);
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const userMsg: ChatMessage = {
      id: generateId('msg'),
      role: 'user',
      text: trimmed,
      ts: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);
    window.setTimeout(() => {
      const intent = classifyIntent(trimmed);
      const response = makeResponse(intent, trimmed);
      setMessages((m) => [
        ...m,
        { id: generateId('msg'), role: 'assistant', text: response, ts: Date.now() },
      ]);
      setThinking(false);
      if (!open) setUnread((u) => u + 1);
      inputRef.current?.focus();
    }, 450 + Math.random() * 350);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        className="fixed z-50 bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-brand-gold text-bg-primary shadow-2xl flex items-center justify-center hover:bg-brand-goldLight transition-transform hover:scale-105"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-down text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="AI Support"
          className="fixed z-50 bottom-20 right-3 md:bottom-24 md:right-6 w-[min(380px,calc(100vw-1.5rem))] h-[min(560px,calc(100vh-7rem))] card flex flex-col overflow-hidden"
          style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
        >
          <header className="px-4 py-3 border-b border-border bg-bg-tertiary flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-gold text-bg-primary flex items-center justify-center font-bold">
              ★
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">StarAI Assistant</p>
              <p className="text-[11px] text-up flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-up inline-block" /> online · context-aware
              </p>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setOpen(false)}
              className="text-text-tertiary hover:text-text-primary"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-bg-primary">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    m.role === 'user'
                      ? 'bg-brand-gold text-bg-primary rounded-br-sm'
                      : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-bg-tertiary text-text-primary rounded-lg rounded-bl-sm px-3 py-2 text-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse-soft" />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse-soft" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse-soft" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 bg-bg-primary border-t border-border">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-[11px] px-2 py-1 rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex gap-2 p-3 border-t border-border bg-bg-secondary">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your account, prices, fees…"
              className="input flex-1 text-sm"
              aria-label="Ask StarAI Assistant"
              disabled={thinking}
            />
            <button
              type="submit"
              className="btn-primary text-sm"
              disabled={thinking || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
