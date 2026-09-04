import { describe, expect, it } from 'vitest';
import { DOCUMENT_HIGHLIGHTS, selectDocumentHighlights } from '../client/utils/documentHighlights';
import type { Document } from '../client/types/documents';

const makeDocument = (filename: string, source: string, id = '42'): Document => ({
  id,
  filename,
  title: filename,
  content: '',
  fileType: 'application/pdf',
  fileSize: 1,
  metadata: { source, tags: [], categories: [], confidentiality: 'public' },
});

describe('document highlights', () => {
  it('resolves selections from source and filename with environment-specific document IDs', () => {
    const [first, second] = DOCUMENT_HIGHLIGHTS;
    const result = selectDocumentHighlights([
      makeDocument(second.filename, second.source, '900'),
      makeDocument(first.filename, first.source, '800'),
    ]);
    expect(result.map((item) => item.document.id)).toEqual(['800', '900']);
  });
  it('does not invent missing records or match copies in another collection', () => {
    const first = DOCUMENT_HIGHLIGHTS[0];
    expect(selectDocumentHighlights([makeDocument(first.filename, 'Unconfirmed Claims')])).toEqual(
      [],
    );
    expect(selectDocumentHighlights([])).toEqual([]);
  });
});
