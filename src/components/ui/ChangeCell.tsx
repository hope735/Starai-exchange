interface ChangeCellProps {
  value: number;
  fractionDigits?: number;
  className?: string;
}

export default function ChangeCell({ value, fractionDigits = 2, className = '' }: ChangeCellProps) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="text-text-tertiary">—</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={`tabular-nums font-medium ${
        positive ? 'text-up' : 'text-down'
      } ${className}`}
    >
      {positive ? '+' : ''}
      {value.toFixed(fractionDigits)}%
    </span>
  );
}
