/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // StarAI original palette inspired by crypto exchanges
        bg: {
          primary: '#0b0e11',
          secondary: '#161a1e',
          tertiary: '#1e2329',
          hover: '#2b3139',
        },
        border: {
          DEFAULT: '#2b3139',
          light: '#363c45',
        },
        brand: {
          gold: '#f0b90b',
          goldDark: '#d4a30a',
          goldLight: '#fcd535',
        },
        text: {
          primary: '#eaecef',
          secondary: '#b7bdc6',
          tertiary: '#848e9c',
        },
        up: '#02c076',
        down: '#f6465d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 0 12px rgba(0,0,0,0.25)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        flashUp: {
          '0%': { backgroundColor: 'rgba(2,192,118,0.35)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(246,70,93,0.35)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'pulse-soft': 'pulseSoft 1.6s ease-in-out infinite',
        'flash-up': 'flashUp 1.2s ease-out',
        'flash-down': 'flashDown 1.2s ease-out',
      },
    },
  },
  plugins: [],
};
