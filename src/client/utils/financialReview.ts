import type { FinancialTransactionDto } from '@shared/dto/financial';

export function financialAmount(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return 'Amount unavailable';
  if (!/^[A-Z]{3}$/.test(currency)) return `${amount.toLocaleString()} · currency unknown`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function financialDate(value: string): string {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime())
    ? 'Date unknown'
    : date.toLocaleDateString('en-GB', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

export function currencyTotals(records: FinancialTransactionDto[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (!Number.isFinite(record.amount)) continue;
    const currency = record.currency || 'Unknown';
    totals.set(currency, (totals.get(currency) || 0) + record.amount);
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function needsPartyReview(record: FinancialTransactionDto): boolean {
  return [record.fromEntityName, record.toEntityName].some(
    (name) => !name || /^(unknown|n\/a|null|undefined)$/i.test(name.trim()),
  );
}
