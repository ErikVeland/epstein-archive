import { beforeEach, describe, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({ source: vi.fn(), identities: vi.fn() }));
vi.mock('@epstein/db', () => ({
  blackBookQueries: {
    getBlackBookSourceEntries: { run: queries.source },
    getBlackBookIdentityIndex: { run: queries.identities },
  },
}));
vi.mock('../server/db/connection.js', () => ({ getApiPool: () => ({}) }));

beforeEach(() => {
  vi.resetModules();
  queries.source.mockResolvedValue([
    {
      id: 1,
      entryText: 'Epstoin, Jeffrey\nOriginal OCR',
      entryCategory: 'original',
      personId: '999',
      documentId: null,
      pageNumber: null,
    },
    {
      id: 2,
      entryText: 'Maxwell, Ghislaine',
      entryCategory: 'original',
      personId: null,
      documentId: null,
      pageNumber: null,
    },
  ]);
  queries.identities.mockResolvedValue([
    { id: '1', fullName: 'Jeffrey Epstein', isVip: 1, thumbnailPath: '/face.jpg' },
    { id: '2', fullName: 'Ghislaine Maxwell', isVip: 1, thumbnailPath: '/maxwell.jpg' },
  ]);
});

describe('Black Book source integrity', () => {
  it('defaults to original records with phone filtering disabled', async () => {
    const { blackBookRepository } = await import('../server/db/blackBookRepository');
    await blackBookRepository.getBlackBookEntries();
    expect(queries.source).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'original', hasPhone: false }),
      expect.anything(),
    );
  });
  it('preserves source OCR and does not attach a portrait to a spelling suggestion', async () => {
    const { blackBookRepository } = await import('../server/db/blackBookRepository');
    const rows = await blackBookRepository.getBlackBookEntries();
    expect(rows.find((row: { id: number }) => row.id === 1)).toMatchObject({
      entryText: 'Epstoin, Jeffrey\nOriginal OCR',
      displayName: 'Epstoin, Jeffrey',
      matchStatus: 'possible_match',
      thumbnailPath: null,
    });
  });
  it('finds surname-first records through the canonical full name', async () => {
    const { blackBookRepository } = await import('../server/db/blackBookRepository');
    const rows = await blackBookRepository.getBlackBookEntries({ search: 'Ghislaine Maxwell' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 2, sourceName: 'Maxwell, Ghislaine', personId: 2 });
  });
});
