import { useEffect, useState } from 'react';

interface CoinIconProps {
  symbol: string;
  image?: string;
  size?: number;
}

const SYMBOL_BG: Record<string, string> = {
  BTC: '#f7931a',
  ETH: '#627eea',
  USDT: '#26a17b',
  BNB: '#f0b90b',
  SOL: '#9945ff',
  XRP: '#23292f',
  ADA: '#0033ad',
  DOGE: '#c2a633',
  USDC: '#2775ca',
  TRX: '#ff060a',
};

export default function CoinIcon({ symbol, image, size = 24 }: CoinIconProps) {
  const upper = symbol.toUpperCase();
  const bg = SYMBOL_BG[upper] ?? '#2b3139';
  const [failed, setFailed] = useState(false);
  const [src, setSrc] = useState<string | undefined>(image);

  useEffect(() => {
    setFailed(false);
    setSrc(image);
  }, [image]);

  if (!src || failed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full text-bg-primary font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.45, background: bg }}
        aria-label={upper}
      >
        {upper.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={upper}
      width={size}
      height={size}
      className="rounded-full shrink-0"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
