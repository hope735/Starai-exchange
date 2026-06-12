interface SparklineProps {
  data?: number[];
  positive?: boolean;
  width?: number;
  height?: number;
}

export default function Sparkline({
  data,
  positive = true,
  width = 120,
  height = 40,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }
  // Filter out any non-finite values so we never pass NaN into Math.min/max
  // or toFixed (both throw or render "NaN" in the SVG path data).
  const clean = data.filter((v) => Number.isFinite(v));
  if (clean.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const stepX = width / (clean.length - 1);
  const points = clean
    .map((v, i) => `${(i * stepX).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
    .join(' ');
  const stroke = positive ? '#02c076' : '#f6465d';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={`spark-${positive ? 'u' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
      <polygon
        fill={`url(#spark-${positive ? 'u' : 'd'})`}
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
}
