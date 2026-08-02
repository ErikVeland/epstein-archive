const NON_EVIDENCE_COLLECTIONS = ['Confirmed Fake', 'Unconfirmed Claims'] as const;

/**
 * Excludes media retained only for debunking or claim review from normal evidence queries.
 *
 * The checks cover both current album assignments and legacy ingest metadata/paths so that
 * previously ingested rows are excluded without deleting the material needed to disprove claims.
 */
export function normalMediaEvidenceWhereSql(alias: string): string {
  const quotedCollections = NON_EVIDENCE_COLLECTIONS.map(
    (collection) => `'${collection.replaceAll("'", "''")}'`,
  ).join(', ');

  return `NOT (
    COALESCE(${alias}.metadata_json->>'evidenceRole', '') IN ('debunking', 'claim_review')
    OR COALESCE(${alias}.metadata_json->>'sourceCollection', '') IN (${quotedCollections})
    OR COALESCE(${alias}.metadata_json->>'source_collection', '') IN (${quotedCollections})
    OR COALESCE(${alias}.file_path, '') ILIKE '%Confirmed Fake%'
    OR COALESCE(${alias}.file_path, '') ILIKE '%Unconfirmed Claims%'
    OR EXISTS (
      SELECT 1
      FROM media_albums evidence_scope_album
      WHERE evidence_scope_album.id = ${alias}.album_id
        AND evidence_scope_album.name IN (${quotedCollections})
    )
  )`;
}

export function evidenceRoleForCollection(
  collectionName: string,
): 'evidence' | 'debunking' | 'claim_review' {
  if (collectionName === 'Confirmed Fake') return 'debunking';
  if (collectionName === 'Unconfirmed Claims') return 'claim_review';
  return 'evidence';
}
