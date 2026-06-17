import { NavLink } from 'react-router-dom';
import Logo from '../ui/Logo';

// Sidebar — desktop navigation. Mirrors the 6-tab order used by
// MobileBottomNav so the experience is consistent across breakpoints.
//
//   Home → Dashboard
//   Markets → Market list
//   Trade → Spot / quick-trade
//   Wallet → Balances & transfers
//   Orders → Order history
//   Profile → Account / KYC / settings

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  icon: JSX.Element;
};

const NAV: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    end: true,
    icon: (
      <path d="M3 11.5 12 4l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-3.25V15h-8.5v6.5H4.5A1.5 1.5 0 0 1 3 20z" />
    ),
  },
  {
    to: '/markets',
    label: 'Markets',
    icon: <path d="M4 4h2v16H4zM10 9h2v11h-2zM16 13h2v7h-2zM21 4l-4 8-3-2-4 5" />,
  },
  {
    to: '/trade',
    label: 'Trade',
    icon: (
      <>
        <path d="M5 8h12l-2-2" />
        <path d="M19 16H7l2 2" />
      </>
    ),
  },
  {
    to: '/wallet',
    label: 'Wallet',
    icon: (
      <>
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V8H5.5A2.5 2.5 0 0 1 3 5.5" />
        <path d="M3 8h18v9.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
        <circle cx="16.5" cy="13.5" r="1.25" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    to: '/orders',
    label: 'Orders',
    icon: (
      <>
        <path d="M4 6h16" />
        <path d="M4 11h16" />
        <path d="M4 16h10" />
        <path d="m17 17 3-3-3-3" />
      </>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
  },
];

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
            end={item.end}
            className={({ isActive }) =>
              [
                'group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium overflow-hidden',
                'transition-all duration-200 ease-out',
                isActive
                  ? 'bg-brand-gold/10 text-brand-gold ring-1 ring-brand-gold/30 shadow-[0_0_18px_-6px_rgba(255,193,7,0.6)]'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {/* Gold accent bar on the left edge for active items. */}
                <span
                  aria-hidden
                  className={[
                    'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand-gold',
                    'transition-all duration-200 ease-out',
                    isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50',
                  ].join(' ')}
                />
                <svg
                  className={[
                    'w-4 h-4 shrink-0 transition-transform duration-200',
                    isActive ? 'scale-110' : 'scale-100',
                  ].join(' ')}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {item.icon}
                </svg>
                <span className={isActive ? 'font-semibold tracking-wide' : ''}>
                  {item.label}
                </span>
              </>
            )}
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
