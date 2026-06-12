import { NavLink } from 'react-router-dom';
import Logo from '../ui/Logo';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/markets', label: 'Markets', icon: 'chart' },
  { to: '/trade', label: 'Trade', icon: 'swap' },
  { to: '/wallet', label: 'Wallet', icon: 'wallet' },
  { to: '/orders', label: 'Orders', icon: 'list' },
  { to: '/profile', label: 'Profile', icon: 'user' },
] as const;

const ICONS: Record<string, JSX.Element> = {
  home: (
    <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" />
  ),
  chart: (
    <path d="M3 3v18h18M7 15l4-4 3 3 5-7" />
  ),
  swap: (
    <path d="M7 7h14l-3-3M17 17H3l3 3" />
  ),
  wallet: (
    <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h14M16 13h2" />
  ),
  list: (
    <path d="M3 6h18M3 12h18M3 18h18" />
  ),
  user: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
  ),
};

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-bg-primary">
      <div className="p-4 border-b border-border">
        <Logo size={24} />
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                isActive
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`
            }
          >
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {ICONS[item.icon]}
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-border text-xs text-text-tertiary space-y-1">
        <p className="font-semibold text-text-secondary">Live account</p>
        <p>Your balances, orders and wallet are linked to your authenticated user account.</p>
      </div>

    </aside>
  );
}
