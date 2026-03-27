export const hexTokens = {
  accent: '#d4a84b',
  accentGlow: 'rgba(212, 168, 75, 0.35)',
  bgDark: '#0a0a0b',
  bgSurface: '#111114',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  riskCritical: '#c0392b',
  riskHigh: '#c0392b',
  riskMedium: '#b8860b',
  riskLow: '#2e7d5a',
  riskMinimal: '#2e7d5a',
  riskUnknown: '#6b7280',
  navDocuments: '#34d399',
  navEmails: '#fbbf24',
  navMedia: '#a78bfa',
  navPeople: '#60a5fa',
  navProperties: '#f97316',
  navBlackbook: '#f472b6',
  navInvestigations: '#ec4899',
} as const;

export const colorTokens = {
  accent: 'var(--accent)',
  accentSecondary: 'var(--accent-secondary)',
  accentSuccess: 'var(--accent-success)',
  accentWarning: 'var(--accent-warning)',
  accentDanger: 'var(--accent-danger)',
  accentInfo: 'var(--accent-info)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  textDisabled: 'var(--text-disabled)',
  bgPage: 'var(--bg-dark)',
  bgSurface: 'var(--bg-surface)',
  bgElevated: 'var(--bg-elevated)',
  glassBg: 'var(--glass-bg)',
  glassBgStrong: 'var(--glass-bg-strong)',
  glassBorder: 'var(--glass-border)',
  glassBorderHighlight: 'var(--glass-border-highlight)',
} as const;

export const semanticTokens = {
  required: 'text-[var(--accent-danger)]',
  errorText: 'text-[var(--accent-danger)]',
  errorBorder:
    'border-[var(--accent-danger)] focus:border-[var(--accent-danger)] focus:ring-[var(--accent-danger)]/20',
  fieldLabel: 'text-[var(--text-secondary)]',
  helperText: 'text-[var(--text-muted)]',
} as const;

export const sourceBadgeTokens = {
  blackBook:
    'bg-[var(--source-black-book-bg)] border-[var(--source-black-book-border)] text-[var(--source-black-book-text)] shadow-[var(--source-black-book-shadow)]',
  seventhProduction:
    'bg-[var(--source-seventh-bg)] border-[var(--source-seventh-border)] text-[var(--source-seventh-text)] shadow-[var(--source-seventh-shadow)]',
  publicRecord:
    'bg-[var(--source-public-bg)] border-[var(--source-public-border)] text-[var(--source-public-text)] shadow-[var(--source-public-shadow)]',
  fallback: 'bg-[var(--glass-bg)]/60 border-[var(--glass-border)] text-[var(--text-muted)]',
} as const;

export const semanticToneClasses = {
  accent: 'tone-accent',
  success: 'tone-success',
  warning: 'tone-warning',
  danger: 'tone-danger',
  info: 'tone-info',
  muted: 'tone-muted',
} as const;
