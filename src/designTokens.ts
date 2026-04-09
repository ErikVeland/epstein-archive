// Runtime token helpers sourced from CSS custom properties in src/client/index.css.
// This module exists for JS/TS consumers; it should never redefine :root values.

export const colors = {
  bg: {
    dark: 'var(--bg-dark)',
    surface: 'var(--bg-surface)',
    elevated: 'var(--bg-elevated)',
  },
  text: {
    strong: 'var(--text-strong)',
    primary: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    muted: 'var(--text-muted)',
    dim: 'var(--text-dim)',
  },
  accent: {
    primary: 'var(--accent)',
    docs: 'var(--accent-docs)',
    emails: 'var(--accent-emails)',
    investigate: 'var(--accent-investigate)',
    evidence: 'var(--accent-evidence)',
    info: 'var(--accent-info)',
    success: 'var(--accent-success)',
    warning: 'var(--accent-warning)',
    danger: 'var(--accent-danger)',
  },
  semantic: {
    risk: {
      critical: 'var(--risk-critical)',
      high: 'var(--risk-high)',
      medium: 'var(--risk-medium)',
      low: 'var(--risk-low)',
      minimal: 'var(--risk-minimal)',
      unknown: 'var(--risk-unknown)',
    },
  },
} as const;

export const typography = {
  fonts: {
    display: 'var(--font-display)',
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
    geometric: 'var(--font-geometric)',
  },
  sizes: {
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    base: 'var(--font-size-base)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
    '2xl': 'var(--font-size-2xl)',
    '3xl': 'var(--font-size-3xl)',
    '4xl': 'var(--font-size-4xl)',
  },
} as const;

export const spacing = {
  1: 'var(--space-1)',
  2: 'var(--space-2)',
  3: 'var(--space-3)',
  4: 'var(--space-4)',
  5: 'var(--space-5)',
  6: 'var(--space-6)',
  8: 'var(--space-8)',
  10: 'var(--space-10)',
  12: 'var(--space-12)',
} as const;

export const radii = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
} as const;

export const shadows = {
  soft: 'var(--glass-shadow-soft)',
  glass: 'var(--glass-shadow)',
} as const;

export const motion = {
  easings: {
    liquid: 'var(--easing-liquid)',
    swift: 'var(--easing-swift)',
    gentle: 'var(--easing-gentle)',
  },
  durations: {
    fast: 'var(--duration-fast)',
    normal: 'var(--duration-normal)',
    slow: 'var(--duration-slow)',
  },
} as const;

export const cssVariables = '';
