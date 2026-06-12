// Notification center — bell icon button in the top nav. Opens a
// dropdown showing the user's notifications grouped by category with
// read/unread state, mark-as-read, and clear-all controls.

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore, type AppNotification, type NotificationCategory } from '../../store/notificationStore';
import { Link } from 'react-router-dom';

const CATEGORY_META: Record<NotificationCategory, { label: string; color: string; icon: string }> = {
  announcement: { label: 'Announcement', color: 'text-brand-gold bg-brand-gold/15', icon: '★' },
  account: { label: 'Account', color: 'text-sky-300 bg-sky-500/15', icon: '👤' },
  market: { label: 'Market', color: 'text-up bg-up/15', icon: '📈' },
  security: { label: 'Security', color: 'text-amber-300 bg-amber-500/15', icon: '🔒' },
  system: { label: 'System', color: 'text-text-tertiary bg-bg-tertiary', icon: '⚙' },
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationCenter() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'default';
  const forUser = useNotificationStore((s) => s.notifications[userId] ?? []);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = forUser.filter((n) => !n.read).length;
  const items = forUser.slice(0, 20);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-md hover:bg-bg-tertiary flex items-center justify-center text-text-secondary hover:text-text-primary"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-down text-white text-[10px] font-bold flex items-center justify-center"
            aria-hidden
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[min(380px,calc(100vw-1.5rem))] card p-0 z-50 overflow-hidden"
          style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
        >
          <header className="px-4 py-3 border-b border-border flex items-center justify-between bg-bg-tertiary">
            <div>
              <p className="font-semibold text-sm">Notifications</p>
              <p className="text-text-tertiary text-[11px]">
                {unread > 0 ? `${unread} unread` : 'You are all caught up'}
              </p>
            </div>
            <div className="flex gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead(userId)}
                  className="text-[11px] text-brand-gold hover:underline px-2"
                >
                  Mark all read
                </button>
              )}
              {forUser.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all notifications?')) clearAll(userId);
                  }}
                  className="text-[11px] text-text-tertiary hover:text-text-primary px-2"
                >
                  Clear
                </button>
              )}
            </div>
          </header>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-text-tertiary text-sm">
                You have no notifications yet.
              </div>
            ) : (
              <ul>
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onClick={() => {
                      if (!n.read) markRead(userId, n.id);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="px-4 py-2 border-t border-border text-center">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="text-[11px] text-text-tertiary hover:text-text-primary"
            >
              Manage notification preferences →
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n, onClick }: { n: AppNotification; onClick: () => void }) {
  const meta = CATEGORY_META[n.category];
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-bg-tertiary ${!n.read ? 'bg-bg-tertiary/50' : ''}`}
      >
        <span className={`w-8 h-8 rounded-full ${meta.color} flex items-center justify-center text-sm shrink-0`}>
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm truncate ${!n.read ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
              {n.title}
            </p>
            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0" />}
          </div>
          <p className="text-xs text-text-tertiary line-clamp-2 mt-0.5">{n.body}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-text-tertiary">
            <span className="pill text-[10px] py-0">{meta.label}</span>
            <span>{timeAgo(n.createdAt)}</span>
          </div>
        </div>
      </button>
    </li>
  );
}
