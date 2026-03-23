import { describe, expect, it } from 'vitest';

import { DocumentProcessor } from '../client/services/documentProcessor';

describe('processing smoke coverage', () => {
  it('processes a representative dossier-like document', async () => {
    const processor = new DocumentProcessor();
    const content = `This document discusses Donald Trump, DT, and DJT who are all the same person.
It also mentions Jeffrey Epstein, Clinton, and Ghislaine Maxwell.

False positives like "In No Event And Under No Legal Theory" should be ignored.

Organizations mentioned: Russia, CIA, FBI, Mossad.

Key contacts: john.smith@whitehouse.gov, (202) 555-1234
Important date: July 4, 2023
Transaction amount: $5,000,000
Location: Washington D.C.`;

    const document = await processor.processDocument('test_requirements.txt', content);
    const entityNames = (document.entities ?? []).map((entity) => entity.name);

    expect(document.fileType).toBe('txt');
    expect(document.redFlagRating).toBeGreaterThanOrEqual(1);
    expect(entityNames).toContain('Donald Trump');
    expect(entityNames).toContain('Jeffrey Epstein');
    expect(entityNames).toEqual(expect.arrayContaining(['Russia', 'CIA', 'FBI', 'Mossad']));
    expect(entityNames).not.toContain('In No Event And Under No Legal Theory');
  });
});
