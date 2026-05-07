export const runtimeTokens = {
  color: {
    accent: 'var(--accent)',
    textStrong: 'var(--text-strong)',
    textPrimary: 'var(--text-primary)',
    textMuted: 'var(--text-muted)',
    glassBg: 'var(--glass-bg)',
    glassBgStrong: 'var(--glass-bg-strong)',
    glassBorder: 'var(--glass-border)',
    danger: 'var(--accent-danger)',
    warning: 'var(--accent-warning)',
    success: 'var(--accent-success)',
  },
  type: {
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    base: 'var(--font-size-base)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
    '2xl': 'var(--font-size-2xl)',
    '3xl': 'var(--font-size-3xl)',
  },
  space: {
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
    8: 'var(--space-8)',
    10: 'var(--space-10)',
    12: 'var(--space-12)',
  },
} as const;

export const semanticChartTokens = {
  series: {
    documents: 'var(--nav-documents)',
    emails: 'var(--nav-emails)',
    media: 'var(--nav-media)',
    people: 'var(--nav-people)',
    flights: 'var(--nav-flights)',
    analytics: 'var(--nav-analytics)',
  },
  risk: {
    critical: 'var(--risk-critical)',
    high: 'var(--risk-high)',
    medium: 'var(--risk-medium)',
    low: 'var(--risk-low)',
    minimal: 'var(--risk-minimal)',
    unknown: 'var(--risk-unknown)',
  },
  axis: {
    grid: 'color-mix(in srgb, var(--glass-border) 64%, transparent)',
    stroke: 'var(--text-dim)',
    tick: 'var(--text-muted)',
    hover: 'color-mix(in srgb, var(--glass-bg-strong) 84%, transparent)',
  },
} as const;

export const annotationTokens = {
  dot: {
    highlight: 'var(--accent)',
    note: 'var(--accent-info)',
    evidence: 'var(--accent-success)',
    question: 'var(--nav-media)',
    contradiction: 'var(--accent-danger)',
    tag: 'var(--accent-info)',
    fallback: 'var(--text-muted)',
  },
  overlayFill: {
    highlight: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    note: 'color-mix(in srgb, var(--accent-info) 18%, transparent)',
    evidence: 'color-mix(in srgb, var(--accent-success) 18%, transparent)',
    question: 'color-mix(in srgb, var(--nav-media) 18%, transparent)',
    contradiction: 'color-mix(in srgb, var(--accent-danger) 20%, transparent)',
    tag: 'color-mix(in srgb, var(--accent-info) 18%, transparent)',
    fallback: 'color-mix(in srgb, var(--accent-warning) 20%, transparent)',
  },
  overlayStroke: {
    highlight: 'color-mix(in srgb, var(--accent) 50%, transparent)',
    note: 'color-mix(in srgb, var(--accent-info) 38%, transparent)',
    evidence: 'color-mix(in srgb, var(--accent-success) 38%, transparent)',
    question: 'color-mix(in srgb, var(--nav-media) 38%, transparent)',
    contradiction: 'color-mix(in srgb, var(--accent-danger) 42%, transparent)',
    tag: 'color-mix(in srgb, var(--accent-info) 38%, transparent)',
    fallback: 'color-mix(in srgb, var(--accent-warning) 40%, transparent)',
  },
} as const;
