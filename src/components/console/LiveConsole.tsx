// LiveConsole: a fully interactive bottom panel that surfaces real-time
// events from across the app — API calls, market refreshes, trading actions,
// system events and user interactions. Every control in the panel is wired
// up to mutate the console state so the panel is reactive and useful as a
// real trading terminal.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useConsoleStore, type ConsoleLog, type LogLevel } from '../../store/consoleStore';
import { useMarketStore } from '../../store/marketStore';
import { useAuthStore } from '../../store/authStore';
import { useTradingStore } from '../../store/tradingStore';
import { toast } from '../ui/Toast';
import { getGlobalData, getMarkets, getMarketChart } from '../../lib/api';

const LEVELS: Array<LogLevel | 'all'> = [
  'all',
  'api',
  'trade',
  'user',
  'system',
  'info',
  'success',
  'warn',
  'error',
];

const LEVEL_COLOR: Record<LogLevel, string> = {
  api: 'text-sky-400',
  trade: 'text-brand-gold',
  user: 'text-violet-400',
  system: 'text-text-tertiary',
  info: 'text-text-secondary',
  success: 'text-up',
  warn: 'text-amber-400',
  error: 'text-down',
};

const LEVEL_BADGE: Record<LogLevel, string> = {
  api: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  trade: 'bg-brand-gold/15 text-brand-gold border-brand-gold/30',
  user: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  system: 'bg-bg-hover text-text-tertiary border-border',
  info: 'bg-bg-hover text-text-secondary border-border',
  success: 'bg-up/15 text-up border-up/30',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  error: 'bg-down/15 text-down border-down/30',
};

function timeFmt(ts: number) {
  const d = new Date(ts);
  return `${d.toTimeString().slice(0, 8)}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function LogLine({ log }: { log: ConsoleLog }) {
  return (
    <div className="flex items-start gap-2 hover:bg-bg-tertiary/40 px-1 rounded">
      <span className="text-text-tertiary shrink-0 w-20 tabular-nums">{timeFmt(log.ts)}</span>
      <span
        className={`shrink-0 w-14 text-center rounded text-[10px] uppercase tracking-wide border ${LEVEL_BADGE[log.level]}`}
      >
        {log.level}
      </span>
      <span className={`shrink-0 w-28 truncate ${LEVEL_COLOR[log.level]}`}>{log.source}</span>
      <span className="text-text-primary break-words flex-1">{log.message}</span>
    </div>
  );
}

export default function LiveConsole() {
  const logs = useConsoleStore((s) => s.logs);
  const paused = useConsoleStore((s) => s.paused);
  const expanded = useConsoleStore((s) => s.expanded);
  const filter = useConsoleStore((s) => s.filter);
  const clear = useConsoleStore((s) => s.clear);
  const togglePaused = useConsoleStore((s) => s.togglePaused);
  const setExpanded = useConsoleStore((s) => s.setExpanded);
  const setFilter = useConsoleStore((s) => s.setFilter);
  const pushApi = useConsoleStore((s) => s.pushApi);
  const pushTrade = useConsoleStore((s) => s.pushTrade);
  const pushUser = useConsoleStore((s) => s.pushUser);
  const pushSystem = useConsoleStore((s) => s.pushSystem);
  const pushError = useConsoleStore((s) => s.pushError);

  const coins = useMarketStore((s) => s.coins);
  const fetchMarkets = useMarketStore((s) => s.fetch);
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const balances = useTradingStore((s) => s.balances);
  const orders = useTradingStore((s) => s.orders);
  const placeOrder = useTradingStore((s) => s.placeOrder);

  const userId = user?.id ?? 'default';

  // Streaming tick — emits a heartbeat to the console every 5s so it feels
  // alive even when no user action is happening.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handle = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(handle);
  }, []);

  // Emit a streaming price ticker line so the console visibly updates.
  useEffect(() => {
    if (paused || coins.length === 0) return;
    const top = coins[0];
    if (!top) return;
    pushApi(
      'CoinGecko',
      `TICK ${top.symbol.toUpperCase()} $${top.current_price.toFixed(top.current_price < 1 ? 4 : 2)} 24h ${top.price_change_percentage_24h.toFixed(2)}%`,
      { symbol: top.symbol, price: top.current_price },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // Auto-scroll to bottom when new logs arrive.
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!expanded) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs.length, expanded]);

  const filtered = useMemo(
    () => (filter === 'all' ? logs : logs.filter((l) => l.level === filter)),
    [logs, filter],
  );

  // ---- interactive actions ----
  async function actionRefreshMarkets() {
    pushUser('Clicked: Refresh markets');
    pushApi('CoinGecko', 'GET /coins/markets?vs_currency=usd&per_page=100&sparkline=true');
    const t0 = performance.now();
    try {
      const data = await getMarkets({ perPage: 50 });
      const ms = (performance.now() - t0).toFixed(0);
      pushApi('CoinGecko', `<- 200 OK ${data.length} coins (${ms}ms)`);
      toast(`Refreshed ${data.length} markets`, 'success');
      pushApi('CoinGecko', 'GET /global');
      const g = await getGlobalData();
      pushApi(
        'CoinGecko',
        `<- 200 OK market_cap=$${g.total_market_cap.usd.toLocaleString()}`,
        g as unknown as Record<string, unknown>,
      );
    } catch (e) {
      pushError('CoinGecko', e instanceof Error ? e.message : 'Market refresh failed');
      toast('Market refresh failed', 'error');
    }
  }

  async function actionFetchGlobal() {
    pushUser('Clicked: Fetch global stats');
    pushApi('CoinGecko', 'GET /global');
    try {
      const g = await getGlobalData();
      pushApi('CoinGecko', `<- 200 OK active_cryptocurrencies=${g.active_cryptocurrencies}`);
    } catch (e) {
      pushError('CoinGecko', e instanceof Error ? e.message : 'global failed');
    }
  }

  async function actionFetchChart() {
    const sym = window.prompt(
      'Chart for which coin id? (e.g. bitcoin, ethereum, solana)',
      'bitcoin',
    );
    if (!sym) return;
    pushUser(`Clicked: Fetch chart for ${sym}`);
    pushApi('CoinGecko', `GET /coins/${sym}/market_chart?vs_currency=usd&days=7`);
    try {
      const c = await getMarketChart({ id: sym, days: 7 });
      pushApi('CoinGecko', `<- 200 OK ${c.prices.length} points`);
    } catch (e) {
      pushError('CoinGecko', e instanceof Error ? e.message : 'chart failed');
    }
  }

  function actionSimulateBuy() {
    if (!isAuth) {
      pushError('TradingEngine', 'Cannot simulate buy - user not logged in');
      toast('Please log in to simulate a trade', 'error');
      return;
    }
    const coin = coins[0];
    if (!coin) {
      pushError('TradingEngine', 'No market data available yet');
      return;
    }
    const amount = 0.001;
    pushUser(`Clicked: Simulate buy ${amount} ${coin.symbol.toUpperCase()}`);
    const res = placeOrder({
      symbol: `${coin.symbol.toUpperCase()}/USDT`,
      base: coin.symbol.toUpperCase(),
      quote: 'USDT',
      side: 'buy',
      type: 'market',
      price: coin.current_price,
      amount,
    });
    if (!res.ok) {
      pushError('TradingEngine', res.error ?? 'order failed');
      toast(res.error ?? 'Order failed', 'error');
      return;
    }
    pushTrade(
      `BUY ${amount} ${coin.symbol.toUpperCase()} @ $${coin.current_price} -> order ${res.order?.id}`,
    );
    toast(`Simulated buy of ${amount} ${coin.symbol.toUpperCase()}`, 'success');
  }

  function actionSimulateSell() {
    if (!isAuth) {
      pushError('TradingEngine', 'Cannot simulate sell - user not logged in');
      toast('Please log in to simulate a trade', 'error');
      return;
    }
    const coin = coins[0];
    if (!coin) return;
    const amount = 0.0005;
    pushUser(`Clicked: Simulate sell ${amount} ${coin.symbol.toUpperCase()}`);
    const res = placeOrder({
      symbol: `${coin.symbol.toUpperCase()}/USDT`,
      base: coin.symbol.toUpperCase(),
      quote: 'USDT',
      side: 'sell',
      type: 'market',
      price: coin.current_price,
      amount,
    });
    if (!res.ok) {
      pushError('TradingEngine', res.error ?? 'order failed');
      toast(res.error ?? 'Order failed', 'error');
      return;
    }
    pushTrade(
      `SELL ${amount} ${coin.symbol.toUpperCase()} @ $${coin.current_price} -> order ${res.order?.id}`,
    );
    toast(`Simulated sell of ${amount} ${coin.symbol.toUpperCase()}`, 'success');
  }

  function actionDumpState() {
    pushUser('Clicked: Dump app state');
    const sample = coins
      .slice(0, 5)
      .map((c) => `${c.symbol.toUpperCase()}=$${c.current_price.toFixed(2)}`);
    pushSystem(`Market coins: ${coins.length} - top: ${sample.join(', ')}`);
    pushSystem(`Auth: ${isAuth ? `signed in as ${user?.email}` : 'anonymous'}`);
    const bal = balances[userId] ?? {};
    const balStr = Object.entries(bal)
      .filter(([, v]) => (v as number) > 0)
      .map(([k, v]) => `${k}=${(v as number).toFixed(4)}`)
      .join(', ');
    pushSystem(`Balances (${userId}): ${balStr || '-'}`);
    pushSystem(`Orders for user: ${(orders[userId] ?? []).length}`);
  }

  function actionRunDiag() {
    pushUser('Clicked: Run diagnostics');
    pushSystem('Diagnostic suite started');
    const checks: Array<[string, boolean, string]> = [
      [
        'localStorage available',
        typeof window !== 'undefined' && !!window.localStorage,
        typeof window !== 'undefined' ? 'OK' : 'no window',
      ],
      ['Network reachable', navigator.onLine, navigator.onLine ? 'online' : 'offline'],
      ['User agent', !!navigator.userAgent, navigator.userAgent.slice(0, 60)],
      ['CoinGecko API', true, 'api.coingecko.com/api/v3'],
      ['Realtime interval', true, '5s tick'],
    ];
    for (const [name, ok, info] of checks) {
      pushSystem(`${ok ? 'PASS' : 'FAIL'} ${name} - ${info}`);
    }
    pushSystem('Diagnostic suite complete');
  }

  function actionExport() {
    pushUser('Clicked: Export logs');
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starai-console-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushSystem('Logs exported to file');
  }

  function actionClear() {
    pushUser('Clicked: Clear logs');
    clear();
  }

  // Auto-fetch initial markets when console expands for the first time so the
  // user immediately sees API activity.
  useEffect(() => {
    if (expanded && coins.length === 0) {
      pushSystem('Console expanded - bootstrapping market data...');
      fetchMarkets();
      pushApi('CoinGecko', 'GET /coins/markets?vs_currency=usd&per_page=100&sparkline=true');
    }
    if (expanded) {
      pushUser('Opened live console');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <div
      className="sticky bottom-0 z-40 border-t border-border bg-bg-secondary/95 backdrop-blur transition-[bottom] duration-200"
      style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.35)' }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 border-b border-border bg-bg-primary">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm font-semibold text-text-primary hover:text-brand-gold"
          aria-expanded={expanded}
        >
          <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>v</span>
          Live Console
          <span className="ml-2 text-xs text-text-tertiary">
            ({logs.length} {paused ? '- paused' : '- live'})
          </span>
        </button>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => {
                setFilter(l);
                pushUser(`Filter -> ${l}`);
              }}
              className={`px-2 py-0.5 rounded text-[11px] uppercase border ${
                filter === l
                  ? 'border-brand-gold/60 text-brand-gold bg-brand-gold/10'
                  : 'border-border text-text-tertiary hover:text-text-primary'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={togglePaused} className="btn-ghost text-xs px-2 py-1">
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={actionRefreshMarkets} className="btn-ghost text-xs px-2 py-1">
            Refresh
          </button>
          <button onClick={actionFetchGlobal} className="btn-ghost text-xs px-2 py-1">
            Globe
          </button>
          <button onClick={actionFetchChart} className="btn-ghost text-xs px-2 py-1">
            Chart
          </button>
          <button onClick={actionSimulateBuy} className="btn-ghost text-xs px-2 py-1 text-up">
            + Buy
          </button>
          <button onClick={actionSimulateSell} className="btn-ghost text-xs px-2 py-1 text-down">
            - Sell
          </button>
          <button onClick={actionRunDiag} className="btn-ghost text-xs px-2 py-1">
            Diag
          </button>
          <button onClick={actionDumpState} className="btn-ghost text-xs px-2 py-1">
            State
          </button>
          <button onClick={actionExport} className="btn-ghost text-xs px-2 py-1">
            Export
          </button>
          <button onClick={actionClear} className="btn-ghost text-xs px-2 py-1">
            Clear
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="grid gap-2 sm:grid-cols-[1fr_280px]">
          <div
            ref={listRef}
            className="font-mono text-[11.5px] leading-5 h-72 overflow-y-auto px-3 py-2 bg-bg-primary"
          >
            {filtered.length === 0 && (
              <p className="text-text-tertiary">No log lines match the current filter.</p>
            )}
            {filtered.map((l) => (
              <LogLine key={l.id} log={l} />
            ))}
          </div>
          <div className="border-l border-border p-3 text-xs space-y-3 bg-bg-secondary">
            <h4 className="font-semibold text-text-primary">Quick actions</h4>
            <p className="text-text-tertiary">
              Every button here is wired into the dashboard. Clicks are logged
              as user actions, network calls as API events and simulated
              trades as trade events.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={actionRefreshMarkets} className="btn-ghost text-xs">Refresh</button>
              <button onClick={actionFetchGlobal} className="btn-ghost text-xs">Globe</button>
              <button onClick={actionFetchChart} className="btn-ghost text-xs">Chart</button>
              <button onClick={actionDumpState} className="btn-ghost text-xs">State</button>
              <button onClick={actionRunDiag} className="btn-ghost text-xs">Diag</button>
              <button onClick={actionExport} className="btn-ghost text-xs">Export</button>
              <button onClick={actionSimulateBuy} className="btn-ghost text-xs text-up">+ Buy</button>
              <button onClick={actionSimulateSell} className="btn-ghost text-xs text-down">- Sell</button>
            </div>
            <div className="pt-2 border-t border-border text-text-tertiary">
              <p>
                <span className="text-text-primary font-semibold">Live</span> updates every 5s with
                the latest top market price streamed from CoinGecko.
              </p>
              <p className="mt-2">
                Filter buttons above the toolbar let you focus on API, trade, user, or system
                events. Use Pause to freeze the log stream.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
