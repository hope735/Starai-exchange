// Number / currency / time formatters used across the app.

export function formatCurrency(value: number, currency = 'USD', opts?: {
  notation?: 'standard' | 'compact';
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) return '—';
  // Intl.NumberFormat requires 0 <= minimum <= maximum <= 100.
  // Choose a sensible default based on the value's magnitude and
  // make sure min never exceeds max.
  const defaultMax = value < 0.01 ? 6 : value < 1 ? 4 : 2;
  const max = Math.max(0, Math.min(20, opts?.maximumFractionDigits ?? defaultMax));
  const defaultMin = value < 1 ? 2 : 0;
  const min = Math.max(0, Math.min(max, opts?.minimumFractionDigits ?? defaultMin));
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: opts?.notation,
      maximumFractionDigits: max,
      minimumFractionDigits: min,
    }).format(value);
  } catch {
    // Fall back to a plain toFixed string if the runtime rejects any
    // combination (some old engines are strict about ranges).
    return `$${(Number(value) || 0).toFixed(Math.min(max, 6))}`;
  }
}

export function formatNumber(value: number, opts?: {
  notation?: 'standard' | 'compact';
  maximumFractionDigits?: number;
}): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) return '—';
  const max = Math.max(0, Math.min(20, opts?.maximumFractionDigits ?? 2));
  try {
    return new Intl.NumberFormat('en-US', {
      notation: opts?.notation,
      maximumFractionDigits: max,
    }).format(value);
  } catch {
    return (Number(value) || 0).toFixed(Math.min(max, 6));
  }
}

export function formatPercent(value: number, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(fractionDigits)}%`;
}

export function shortenAddress(addr: string, chars = 4): string {
  if (!addr) return '';
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
