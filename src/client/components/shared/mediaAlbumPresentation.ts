import type { MediaAlbum } from '@client/hooks/useMediaBrowser';

export type MediaAlbumGroupKey = 'source' | 'curated' | 'review';

export interface MediaAlbumGroup {
  key: MediaAlbumGroupKey;
  label: string;
  description: string;
  albums: MediaAlbum[];
}

const GROUPS: ReadonlyArray<Omit<MediaAlbumGroup, 'albums'>> = [
  {
    key: 'source',
    label: 'Source collections',
    description: 'Published releases and document productions.',
  },
  {
    key: 'curated',
    label: 'Curated subjects',
    description: 'Topic-based collections assembled for research.',
  },
  {
    key: 'review',
    label: 'Review material',
    description: 'Reporting, removals, disputed material, and claim review.',
  },
];

const SOURCE_COLLECTION_PATTERN =
  /^(?:\d{1,2}[.-]\d{1,2}[.-]\d{2,4}|DOJ\b|Court Case Evidence$|Epstein Estate|Maxwell Proffer$)/i;
const REVIEW_COLLECTION_PATTERN = /^(?:Confirmed Fake|Unconfirmed Claims|Removed by DOJ|Wired)$/i;

export function mediaAlbumGroupKey(name: string): MediaAlbumGroupKey {
  if (REVIEW_COLLECTION_PATTERN.test(name.trim())) return 'review';
  if (SOURCE_COLLECTION_PATTERN.test(name.trim())) return 'source';
  return 'curated';
}

export function groupMediaAlbums(albums: MediaAlbum[]): MediaAlbumGroup[] {
  return GROUPS.map((group) => ({
    ...group,
    albums: albums
      .filter((album) => mediaAlbumGroupKey(album.name) === group.key)
      .sort((left, right) => left.name.localeCompare(right.name)),
  })).filter((group) => group.albums.length > 0);
}
