interface LogoProps {
  size?: number;
  showText?: boolean;
}

export default function Logo({ size = 28, showText = true }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden
      >
        <defs>
          <linearGradient id="staraiLogo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fcd535" />
            <stop offset="1" stopColor="#f0b90b" />
          </linearGradient>
        </defs>
        <path d="M32 6 L40 22 L32 38 L24 22 Z" fill="url(#staraiLogo)" />
        <path d="M32 24 L50 30 L32 58 L14 30 Z" fill="url(#staraiLogo)" opacity="0.9" />
      </svg>
      {showText && (
        <span className="font-bold text-text-primary tracking-tight" style={{ fontSize: size * 0.7 }}>
          Star<span className="text-brand-gold">AI</span>
        </span>
      )}
    </span>
  );
}
