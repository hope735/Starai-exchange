import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Logo from '../ui/Logo';
import { useAuthStore } from '../../store/authStore';
import { seedDefaultNotifications } from '../../store/notificationStore';
import NotificationCenter from '../notifications/NotificationCenter';
import { useTradingStore, WELCOME_BONUS_USDT } from '../../store/tradingStore';




const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/markets', label: 'Markets' },
  { to: '/trade', label: 'Trade' },
];

export default function TopNav() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  function onSubmitSearch(e: React.FormEvent) {
    e.preventDefault();
    const symbol = search.trim().toUpperCase().replace(/[^A-Z0-9/_-]/g, '');
    if (!symbol) return;
    navigate(`/trade/${symbol.includes('/') ? symbol : symbol.replace(/(USDT|USDC|BTC|ETH)$/, '') + 'USDT'}`);
  }

  // When the user becomes authenticated, seed the welcome bonus and
  // the default notification feed. The bonus is idempotent — the
  // trading store will only set the USDT bonus on the user's first
  // login if it has not been claimed before.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    try {
      const bonus = useTradingStore.getState().getBonusesFor(user.id);
      if (!bonus.USDT || bonus.USDT < WELCOME_BONUS_USDT) {
        useTradingStore.setState((s) => ({
          bonuses: { ...s.bonuses, [user.id]: { ...(s.bonuses[user.id] ?? {}), USDT: WELCOME_BONUS_USDT } },
        }));
      }
    } catch { /* ignore */ }
    try { seedDefaultNotifications(user.id); } catch { /* ignore */ }
  }, [isAuthenticated, user?.id]);


  return (
    <header className="sticky top-0 z-40 bg-bg-primary/95 backdrop-blur border-b border-border">
      <div className="flex items-center gap-3 px-3 sm:px-6 h-14">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Logo size={28} />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium ${
                  isActive ? 'text-text-primary bg-bg-tertiary' : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <form onSubmit={onSubmitSearch} className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
              placeholder="Search markets e.g. BTC, ETH/USDT"
              className="input pl-9"
              aria-label="Search markets"
            />
            <svg
              className="absolute left-3 top-2.5 w-4 h-4 text-text-tertiary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </form>
        <div className="flex-1 md:hidden" />
        <div className="flex items-center gap-2">
          {isAuthenticated && <NotificationCenter />}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-md bg-bg-tertiary hover:bg-bg-hover px-2.5 py-1.5 text-sm"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <span className="w-7 h-7 rounded-full bg-brand-gold text-bg-primary flex items-center justify-center font-bold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
                <span className="hidden sm:inline text-text-primary">{user?.name?.split(' ')[0]}</span>
                <svg className="w-3 h-3 text-text-tertiary" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>

              {open && (
                <div
                  className="absolute right-0 mt-2 w-56 card p-1 shadow-panel z-50"
                  onMouseLeave={() => setOpen(false)}
                  role="menu"
                >
                  <div className="px-3 py-2 text-xs text-text-tertiary border-b border-border">
                    {user?.email}
                  </div>
                  <Link to="/wallet" className="block px-3 py-2 rounded hover:bg-bg-hover text-sm" onClick={() => setOpen(false)}>
                    Wallet
                  </Link>
                  <Link to="/orders" className="block px-3 py-2 rounded hover:bg-bg-hover text-sm" onClick={() => setOpen(false)}>
                    Order History
                  </Link>
                  <Link to="/profile" className="block px-3 py-2 rounded hover:bg-bg-hover text-sm" onClick={() => setOpen(false)}>
                    Profile & Security
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-bg-hover text-sm text-down"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost hidden sm:inline-flex">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
