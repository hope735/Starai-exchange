interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-border border-t-brand-gold ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
