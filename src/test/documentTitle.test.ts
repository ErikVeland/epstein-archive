import { describe, expect, it } from 'vitest';
import {
  deriveDocumentTitle,
  extractDocumentNumber,
  isFallbackDocumentTitle,
  isMissingDocumentTitle,
} from '../shared/documentTitle';

describe('document titles', () => {
  it('keeps a stored title', () => {
    expect(deriveDocumentTitle({ id: 1, title: 'Deposition of Jane Doe' })).toEqual({
      title: 'Deposition of Jane Doe',
      source: 'stored',
    });
  });

  it('uses the first useful sentence from an AI summary', () => {
    expect(
      deriveDocumentTitle({
        id: 2,
        fileName: 'EFTA00762842.pdf',
        aiSummary:
          'This email coordinates travel arrangements for March 2010. It names two people.',
      }),
    ).toEqual({
      title: 'This email coordinates travel arrangements for March 2010',
      source: 'ai_summary',
    });
  });

  it('removes the generated summary fallback prefix', () => {
    expect(
      deriveDocumentTitle({
        id: 3,
        fileName: 'EFTA00000003.pdf',
        aiSummary:
          'Document "EFTA00000003.pdf" summary preview: Letter concerning a property payment and invoice.',
      }),
    ).toMatchObject({ title: 'Letter concerning a property payment and invoice' });
  });

  it('uses an OCR email subject before other OCR lines', () => {
    expect(
      deriveDocumentTitle({
        id: 4,
        ocrText: 'From: example@example.com\nSubject: Travel schedule for New York\nBody text',
      }),
    ).toEqual({ title: 'Travel schedule for New York', source: 'ocr' });
  });

  it('uses the document number, then the database id, as fallbacks', () => {
    expect(extractDocumentNumber('/DataSet 10/EFTA01645970.pdf')).toBe('EFTA01645970');
    expect(deriveDocumentTitle({ id: 5, fileName: 'EFTA01645970.pdf' }).title).toBe('EFTA01645970');
    expect(deriveDocumentTitle({ id: 324805, fileName: 'scan.pdf' }).title).toBe('Document 324805');
  });

  it('recognizes current placeholder titles', () => {
    expect(isMissingDocumentTitle('Untitled Source')).toBe(true);
    expect(isMissingDocumentTitle('Untitled document')).toBe(true);
  });

  it('recognizes document-number fallbacks that enrichment can improve', () => {
    expect(
      isFallbackDocumentTitle({ id: 5, title: 'EFTA01645970', fileName: 'EFTA01645970.pdf' }),
    ).toBe(true);
    expect(isFallbackDocumentTitle({ id: 5, title: 'Document 5', fileName: 'scan.pdf' })).toBe(
      true,
    );
  });
});
