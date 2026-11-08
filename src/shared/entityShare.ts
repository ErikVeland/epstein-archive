export const ARCHIVE_ORIGIN = 'https://epstein.academy';

export function entityShareDetails(entity: {
  id: string | number;
  fullName?: string;
  primaryRole?: string;
}) {
  const id = encodeURIComponent(String(entity.id));
  const name = entity.fullName?.trim() || 'Archive profile';
  const role = entity.primaryRole?.trim();
  const title = role && role !== 'Unknown' ? `${name} · ${role}` : name;
  return {
    title,
    url: `${ARCHIVE_ORIGIN}/entity/${id}`,
    image: `${ARCHIVE_ORIGIN}/api/entities/${id}/share-image`,
    description: `Explore documents and references for ${name} in The Epstein Files. Inclusion in the archive does not establish wrongdoing.`,
    imageAlt: `${title} — The Epstein Files profile card`,
  };
}
