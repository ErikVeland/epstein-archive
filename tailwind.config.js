import colors from 'tailwindcss/colors';

const tokenRgb = (tokenName, fallbackHex) => {
  const normalizedHex = String(fallbackHex).replace('#', '');
  const chunk =
    normalizedHex.length === 3
      ? normalizedHex.split('').map((c) => c + c)
      : [normalizedHex.slice(0, 2), normalizedHex.slice(2, 4), normalizedHex.slice(4, 6)];
  const rgb = chunk.map((hex) => parseInt(hex, 16)).join(' ');
  return `rgb(var(--twc-${tokenName}, ${rgb}) / <alpha-value>)`;
};

const tokenizeScale = (family, palette) =>
  Object.fromEntries(
    Object.entries(palette)
      .filter(([, value]) => typeof value === 'string' && value.startsWith('#'))
      .map(([shade, value]) => [shade, tokenRgb(`${family}-${shade}`, value)]),
  );

const tokenizedPaletteFamilies = {
  amber: tokenizeScale('amber', colors.amber),
  blue: tokenizeScale('blue', colors.blue),
  cyan: tokenizeScale('cyan', colors.cyan),
  emerald: tokenizeScale('emerald', colors.emerald),
  fuchsia: tokenizeScale('fuchsia', colors.fuchsia),
  gray: { ...tokenizeScale('gray', colors.gray), 650: tokenRgb('gray-650', '#475569') },
  green: tokenizeScale('green', colors.green),
  indigo: tokenizeScale('indigo', colors.indigo),
  orange: tokenizeScale('orange', colors.orange),
  pink: tokenizeScale('pink', colors.pink),
  purple: tokenizeScale('purple', colors.purple),
  red: tokenizeScale('red', colors.red),
  rose: tokenizeScale('rose', colors.rose),
  slate: tokenizeScale('slate', colors.slate),
  teal: tokenizeScale('teal', colors.teal),
  violet: tokenizeScale('violet', colors.violet),
  yellow: tokenizeScale('yellow', colors.yellow),
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ...tokenizedPaletteFamilies,
        primary: tokenizeScale('primary', colors.sky),
        danger: tokenizeScale('danger', colors.red),
        bg: {
          elevated: 'var(--bg-elevated, #1e293b)',
          surface: 'var(--bg-surface, #0f172a)',
          subtle: 'var(--bg-subtle, #1e293b)',
        },
        border: {
          subtle: 'var(--border-subtle, #334155)',
          strong: 'var(--border-strong, #475569)',
        },
        accent: {
          primary: 'var(--accent-primary, #2f96ee)',
          secondary: 'var(--accent-secondary, #5fb8ff)',
          success: 'var(--accent-success, #2dcf96)',
          warning: 'var(--accent-warning, #f4b549)',
          danger: 'var(--accent-danger, #ff6b6b)',
        },
        accentSoft: {
          primary: 'var(--accent-soft-primary, #3b82f620)',
          secondary: 'var(--accent-soft-secondary, #8b5cf620)',
          danger: 'var(--accent-soft-danger, #ef444420)',
        },
        text: {
          primary: 'var(--text-primary, #ffffff)',
          secondary: 'var(--text-secondary, #e2e8f0)',
          tertiary: 'var(--text-tertiary, #cbd5e1)',
          disabled: 'var(--text-disabled, #94a3b8)',
        },
        semantic: {
          risk: {
            critical: 'var(--risk-critical, #fb4b5f)',
            high: 'var(--risk-high, #ff4d4d)',
            medium: 'var(--risk-medium, #fbbf24)',
            low: 'var(--risk-low, #14b8a6)',
            minimal: 'var(--risk-minimal, #22c55e)',
            unknown: 'var(--risk-unknown, #94a3b8)',
          },
        },
      },
      spacing: {
        1: 'var(--space-1, 0.25rem)',
        2: 'var(--space-2, 0.5rem)',
        3: 'var(--space-3, 0.75rem)',
        4: 'var(--space-4, 1rem)',
        5: 'var(--space-5, 1.25rem)',
        6: 'var(--space-6, 1.5rem)',
        8: 'var(--space-8, 2rem)',
        10: 'var(--space-10, 2.5rem)',
        12: 'var(--space-12, 3rem)',
      },
      borderRadius: {
        sm: 'var(--radius-sm, 0.5rem)',
        md: 'var(--radius-md, 0.75rem)',
        lg: 'var(--radius-lg, 1rem)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))',
        md: 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06))',
        lg: 'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05))',
        xl: 'var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04))',
      },
      fontFamily: {
        sans: ['var(--font-sans, "Inter")', 'sans-serif'],
        mono: ['var(--font-mono, "JetBrains Mono")', 'monospace'],
      },
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modalBackdrop: '1040',
        modal: '1050',
        popover: '1060',
        tooltip: '1070',
      },
      transitionTimingFunction: {
        liquid: 'var(--easing-liquid, cubic-bezier(0.2, 0.8, 0.2, 1))',
        swift: 'var(--easing-swift, cubic-bezier(0.4, 0, 0.2, 1))',
        gentle: 'var(--easing-gentle, cubic-bezier(0, 0, 0.2, 1))',
      },
      transitionDuration: {
        fast: 'var(--duration-fast, 150ms)',
        normal: 'var(--duration-normal, 300ms)',
        slow: 'var(--duration-slow, 500ms)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
};
