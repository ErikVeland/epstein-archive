import { describe, expect, it } from 'vitest';

import { DocumentProcessor } from '../client/services/documentProcessor';

describe('document processor integration', () => {
  it('processes a batch and returns searchable results', async () => {
    const processor = new DocumentProcessor();

    const documents = await processor.processDocumentBatch([
      {
        path: 'integration/alpha.txt',
        content: 'Donald Trump, DT, and DJT appear in this record alongside Russia and the CIA.',
      },
      {
        path: 'integration/beta.txt',
        content: 'Jeffrey Epstein appears in a flight note with Mossad and the FBI.',
      },
    ]);

    expect(documents).toHaveLength(2);
    expect(documents.map((document) => document.title)).toEqual(['alpha', 'beta']);

    const results = processor.searchDocuments('epstein');
    expect(results.map((document) => document.title)).toContain('beta');
  });
});
