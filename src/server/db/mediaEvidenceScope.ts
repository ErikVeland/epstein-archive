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

/**
 * Excludes document rows that are themselves marked as non-evidence or are backed by a media
 * item in a rebuttal collection. Media imports create both rows, so filtering only media_items
 * leaves the document mention available to entity evidence ranking.
 */
export function normalDocumentEvidenceWhereSql(alias: string): string {
  return `NOT (
    COALESCE(${alias}.metadata_json->>'evidenceRole', '') IN ('debunking', 'claim_review')
    OR COALESCE(${alias}.metadata_json->>'sourceCollection', '') IN ('Confirmed Fake', 'Unconfirmed Claims')
    OR COALESCE(${alias}.metadata_json->>'source_collection', '') IN ('Confirmed Fake', 'Unconfirmed Claims')
    OR COALESCE(${alias}.file_path, '') ILIKE '%Confirmed Fake%'
    OR COALESCE(${alias}.file_path, '') ILIKE '%Unconfirmed Claims%'
    OR EXISTS (
      SELECT 1
      FROM media_items evidence_scope_media
      LEFT JOIN media_albums evidence_scope_document_album
        ON evidence_scope_document_album.id = evidence_scope_media.album_id
      WHERE (evidence_scope_media.document_id = ${alias}.id OR evidence_scope_media.file_path = ${alias}.file_path)
        AND (
          COALESCE(evidence_scope_media.metadata_json->>'evidenceRole', '') IN ('debunking', 'claim_review')
          OR COALESCE(evidence_scope_media.metadata_json->>'sourceCollection', '') IN ('Confirmed Fake', 'Unconfirmed Claims')
          OR COALESCE(evidence_scope_media.metadata_json->>'source_collection', '') IN ('Confirmed Fake', 'Unconfirmed Claims')
          OR COALESCE(evidence_scope_media.file_path, '') ILIKE '%Confirmed Fake%'
          OR COALESCE(evidence_scope_media.file_path, '') ILIKE '%Unconfirmed Claims%'
          OR evidence_scope_document_album.name IN ('Confirmed Fake', 'Unconfirmed Claims')
        )
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
