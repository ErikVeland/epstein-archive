export const spacingScale = {
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

export const spacingTokens = {
  fieldGap: 'mb-[var(--space-4)]',
  labelGap: 'mb-[var(--space-2)]',
  helperGap: 'mt-[var(--space-1)]',
  cardPadding: 'p-[var(--space-6)]',
  cardSectionGap: 'space-y-[var(--space-5)]',
  chipPadding: 'px-[var(--space-2)] py-[var(--space-1)]',
} as const;
