import { describe, expect, it } from 'vitest';
import { mapFinancialTransactionDto } from '../../src/server/mappers/financialDtoMapper';
import { financialRecordsSchema } from '../../src/shared/contracts/financial';
import {
  currencyTotals,
  financialAmount,
  financialDate,
  needsPartyReview,
} from '../../src/client/utils/financialReview';

describe('financial evidence review', () => {
  const row = {
    id: 12,
    from_entity: 'Sender',
    to_entity: 'Recipient',
    amount: 25.5,
    currency: 'USD',
    transaction_date: '2001-02-03',
    source_document_id: '456',
    method: 'CHECK',
  };
  it('preserves provenance and method through the API contract', () => {
    const [record] = financialRecordsSchema.parse([mapFinancialTransactionDto(row)]);
    expect(record.sourceDocumentId).toBe('456');
    expect(record.method).toBe('CHECK');
    expect(record.fromEntityName).toBe('Sender');
  });
  it('keeps currencies separate and uses only the passed selection', () => {
    const usd = mapFinancialTransactionDto(row);
    const eur = { ...usd, currency: 'EUR', amount: 100 };
    expect(currencyTotals([usd, eur])).toEqual([
      ['EUR', 100],
      ['USD', 25.5],
    ]);
    expect(currencyTotals([eur])).toEqual([['EUR', 100]]);
  });
  it('handles unknown dates, currencies and parties without invented values', () => {
    expect(financialDate('nonsense')).toBe('Date unknown');
    expect(financialAmount(12, '')).toContain('currency unknown');
    expect(
      needsPartyReview({ ...mapFinancialTransactionDto(row), fromEntityName: 'Unknown' }),
    ).toBe(true);
    expect(mapFinancialTransactionDto({ id: 2 }).sourceDocumentId).toBeNull();
  });
  it('rejects malformed server payloads instead of using a snapshot fallback', () => {
    expect(() => financialRecordsSchema.parse({ financialTransactions: [] })).toThrow();
    expect(() => financialRecordsSchema.parse([{ id: '1', amount: 'invalid' }])).toThrow();
    expect(financialRecordsSchema.parse([])).toEqual([]);
  });
});
