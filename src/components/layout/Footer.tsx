import Logo from '../ui/Logo';

export default function Footer() {
  return (
    <footer className="hidden md:block border-t border-border bg-bg-primary">
      <div className="px-6 py-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <Logo size={22} />
          <p className="mt-2 text-text-tertiary">
            StarAI Exchange — a modern, fully responsive cryptocurrency
            exchange built with React, TypeScript and Tailwind CSS.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Markets</h4>
          <ul className="space-y-1 text-text-secondary">
            <li>Spot</li>
            <li>Limit & Market orders</li>
            <li>Live price charts</li>
            <li>Watchlist</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Account</h4>
          <ul className="space-y-1 text-text-secondary">
            <li>Sign in</li>
            <li>Register</li>
            <li>Wallet</li>
            <li>Security</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Risk disclosure</h4>
          <p className="text-text-tertiary">
            Cryptocurrency trading involves significant risk and is volatile.
            Past performance is not indicative of future results. Only trade
            with funds you can afford to lose.
          </p>
        </div>

      </div>
      <div className="border-t border-border px-6 py-3 text-xs text-text-tertiary flex items-center justify-between">
        <span>© {new Date().getFullYear()} StarAI Exchange.</span>
        <span>Data: CoinGecko public API</span>

      </div>
    </footer>
  );
}
