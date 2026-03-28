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
