import { describe, expect, it } from 'vitest';

import { DocumentProcessor } from '../client/services/documentProcessor';

const testDocumentContent = `This is a test document about Donald Trump and Jeffrey Epstein.
It mentions Trump, DT, and DJT which should all be consolidated to Donald Trump.

False positive phrases like "In No Event And Under No Legal Theory" and
"Including Any Direct" should not be identified as entities.

Organizations like Russia, CIA, FBI, and Mossad should be recognized as entities.

Contact: john.doe@example.com
Phone: (555) 123-4567
Date: January 15, 2023
Amount: $1,000,000
Location: New York`;

describe('DocumentProcessor', () => {
  it('processes a document and extracts canonical entities', async () => {
    const processor = new DocumentProcessor();
    const document = await processor.processDocument('test.txt', testDocumentContent);
    const entityNames = (document.entities ?? []).map((entity) => entity.name);
    const passages = document.passages ?? [];

    expect(document.title).toBe('test');
    expect(document.fileType).toBe('txt');
    expect(entityNames).toEqual(
      expect.arrayContaining(['Donald Trump', 'Jeffrey Epstein', 'Russia', 'CIA', 'FBI', 'Mossad']),
    );
    expect(entityNames).not.toContain('In No Event And Under No Legal Theory');
    expect(document.redFlagScore).toBeGreaterThan(0);
    expect(passages.length).toBeGreaterThan(0);
  });

  it('indexes processed documents for search', async () => {
    const processor = new DocumentProcessor();

    await processor.processDocument(
      'batch/alpha.txt',
      'Donald Trump appeared in New York with Jeffrey Epstein.',
    );
    await processor.processDocument(
      'batch/beta.txt',
      'Ghislaine Maxwell coordinated a flight manifest review.',
    );

    const results = processor.searchDocuments('donald trump');

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('alpha');
  });
});
