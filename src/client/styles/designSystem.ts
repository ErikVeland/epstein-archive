export const spacingTokens = {
  fieldGap: 'mb-[var(--space-4)]',
  labelGap: 'mb-[var(--space-2)]',
  helperGap: 'mt-[var(--space-1)]',
  cardPadding: 'p-[var(--space-6)]',
  cardSectionGap: 'space-y-[var(--space-5)]',
  chipPadding: 'px-[var(--space-2)] py-[var(--space-1)]',
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
