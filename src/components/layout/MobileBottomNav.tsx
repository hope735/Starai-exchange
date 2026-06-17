import { NavLink } from 'react-router-dom';

/**
 * Mobile bottom navigation — 6 tabs for thumb-friendly one-handed use.
 *
 *   Home   — Dashboard
 *   Markets — Market list
 *   Trade  — Spot / quick-trade
 *   Wallet — Balances & transfers
 *   Orders — Order history
 *   Profile — Account / KYC / settings
 *
 * Active state has a strong, animated treatment so the user always
 * knows where they are:
 *   - The tab's icon & label switch to the brand gold colour
 *   - A pill-shaped highlight slides under the tab
 *   - The whole tab scales up slightly
 *   - A small accent dot pulses to confirm the tap landed
 *
 * The component is hidden on md+ breakpoints so it doesn't compete with
 * the desktop Sidebar.
 */

type Tab = {
  to: string;
  label: string;
  // The "end" prop is only true for routes that should match exactly.
  // (Otherwise / would always be active.)
  end?: boolean;
  icon: JSX.Element;
};

const TABS: Tab[] = [
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
    icon: (
      <path d="M4 4h2v16H4zM10 9h2v11h-2zM16 13h2v7h-2zM21 4l-4 8-3-2-4 5" />
    ),
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

export default function MobileBottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] border-t border-border bg-bg-secondary/90 backdrop-blur-xl shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.6)]"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-6">
        {TABS.map((tab) => (
          <li key={tab.to} className="relative">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                [
                  'group relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium select-none',
                  'transition-all duration-200 ease-out',
                  isActive
                    ? 'text-brand-gold scale-[1.04]'
                    : 'text-text-tertiary hover:text-text-secondary active:scale-95',
                ].join(' ')
              }
              aria-label={tab.label}
            >
              {({ isActive }) => (
                <>
                  {/* Animated highlight pill — slides under the active tab. */}
                  <span
                    aria-hidden
                    className={[
                      'absolute inset-x-2 top-1 h-9 rounded-xl pointer-events-none',
                      'bg-gradient-to-b from-brand-gold/25 via-brand-gold/15 to-transparent',
                      'ring-1 ring-brand-gold/40 shadow-[0_0_24px_-2px_rgba(255,193,7,0.55)]',
                      'transition-all duration-300 ease-out',
                      isActive
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-95 translate-y-1',
                    ].join(' ')}
                  />

                  {/* Top accent bar — also slides on activation. */}
                  <span
                    aria-hidden
                    className={[
                      'absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full bg-brand-gold',
                      'transition-all duration-300 ease-out',
                      isActive ? 'w-8 opacity-100' : 'w-0 opacity-0',
                    ].join(' ')}
                  />

                  {/* The icon container — the active tab also gets a subtle scale + glow. */}
                  <span
                    className={[
                      'relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-full',
                      'transition-all duration-200 ease-out',
                      isActive
                        ? 'bg-brand-gold/15 ring-1 ring-brand-gold/50 shadow-[0_0_18px_-2px_rgba(255,193,7,0.7)]'
                        : 'bg-transparent ring-0 shadow-none',
                    ].join(' ')}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={[
                        'h-[18px] w-[18px] transition-transform duration-200',
                        isActive ? 'scale-110' : 'scale-100',
                      ].join(' ')}
                      aria-hidden
                    >
                      {tab.icon}
                    </svg>

                    {/* Pulse dot — fades in on the active tab. */}
                    <span
                      aria-hidden
                      className={[
                        'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand-gold',
                        'transition-all duration-300 ease-out',
                        isActive ? 'opacity-100 scale-100 mobnav-pulse' : 'opacity-0 scale-50',
                      ].join(' ')}
                    />
                  </span>

                  {/* Label. */}
                  <span
                    className={[
                      'relative z-10 leading-none tracking-wide',
                      isActive ? 'font-bold text-brand-gold' : 'font-medium',
                    ].join(' ')}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
