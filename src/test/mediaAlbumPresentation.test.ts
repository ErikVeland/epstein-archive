import { describe, expect, it } from 'vitest';
import {
  groupMediaAlbums,
  mediaAlbumGroupKey,
} from '../client/components/shared/mediaAlbumPresentation';
import type { MediaAlbum } from '../client/hooks/useMediaBrowser';

function album(id: number, name: string): MediaAlbum {
  return { id, name, description: `${name} context`, itemCount: id + 1 };
}

describe('media album presentation', () => {
  it('separates source collections, curated subjects, and review material', () => {
    expect(mediaAlbumGroupKey('DOJ Data Set 8')).toBe('source');
    expect(mediaAlbumGroupKey('12.03.25 USVI Production')).toBe('source');
    expect(mediaAlbumGroupKey('Properties')).toBe('curated');
    expect(mediaAlbumGroupKey('Confirmed Fake')).toBe('review');
  });

  it('returns stable groups and sorts albums within each group', () => {
    const groups = groupMediaAlbums([
      album(2, 'Properties'),
      album(1, 'DOJ Data Set 8'),
      album(3, 'Aircraft'),
      album(4, 'Unconfirmed Claims'),
    ]);

    expect(groups.map((group) => group.key)).toEqual(['source', 'curated', 'review']);
    expect(groups[1].albums.map((item) => item.name)).toEqual(['Aircraft', 'Properties']);
  });
});
