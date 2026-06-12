import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: 'Home', icon: 'M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z' },
  { to: '/markets', label: 'Markets', icon: 'M3 3v18h18M7 15l4-4 3 3 5-7' },
  { to: '/trade', label: 'Trade', icon: 'M7 7h14l-3-3M17 17H3l3 3' },
  { to: '/wallet', label: 'Wallet', icon: 'M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h14M16 13h2' },
  { to: '/profile', label: 'Me', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' },
];

export default function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-secondary border-t border-border">
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${
                  isActive ? 'text-brand-gold' : 'text-text-secondary'
                }`
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
                aria-hidden
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
