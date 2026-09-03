import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

interface ConsolidationRule {
  source: string;
  target: string;
  contextTag: string;
  tagCategory: 'dataset' | 'source-date' | 'subject';
  reason: string;
  sourceCollection?: string;
  missingDescription: string;
}

const CONSOLIDATION_RULES: ConsolidationRule[] = [
  {
    source: '4 December 2025',
    target: '12.03.25 USVI Production',
    contextTag: 'source-date:2025-12-04',
    tagCategory: 'source-date',
    reason: 'Nested release date consolidated into its parent source production.',
    sourceCollection: '12.03.25 USVI Production',
    missingDescription:
      'Graphic from the 4 December 2025 material in the 12.03.25 USVI Production collection.',
  },
  {
    source: 'Document Asset Gallery',
    target: 'DOJ Data Set 8',
    contextTag: 'dataset:DOJ Data Set 8',
    tagCategory: 'dataset',
    reason: 'Document extraction consolidated into its verified source dataset.',
    sourceCollection: 'DOJ Data Set 8',
    missingDescription: 'Document image extracted from a source record in DOJ Data Set 8.',
  },
  {
    source: 'Aircraft',
    target: 'Evidence',
    contextTag: 'Aircraft',
    tagCategory: 'subject',
    reason: 'Single-image subject album consolidated into the curated evidence collection.',
    missingDescription:
      'Archival aircraft photograph. The Aircraft tag preserves its subject context.',
  },
  {
    source: 'Les Wexner',
    target: 'Evidence',
    contextTag: 'Les Wexner',
    tagCategory: 'subject',
    reason: 'Single-image subject album consolidated into the curated evidence collection.',
    missingDescription:
      'Archival group photograph previously catalogued under Les Wexner. Depicted identities are not verified by the album label.',
  },
  {
    source: 'Whistleblowers',
    target: 'Evidence',
    contextTag: 'Whistleblowers',
    tagCategory: 'subject',
    reason: 'Single-image subject album consolidated into the curated evidence collection.',
    missingDescription:
      'Archival photograph previously catalogued under Whistleblowers. Depicted identities and event context require source verification.',
  },
];

const ALBUM_DESCRIPTIONS: Record<string, string> = {
  '12.03.25 USVI Production':
    'Photographs and visual records from the 12.03.25 U.S. Virgin Islands source production.',
  '12.11.25 Estate Production':
    'Photographs and visual records from the 12.11.25 Epstein estate source production.',
  '12.18.25 Release': 'Photographs and visual records from the 12.18.25 source release.',
  'Confirmed Fake':
    'Reference material retained to document items verified as manipulated or fabricated. This collection is excluded from normal evidence views.',
  'Court Case Evidence':
    'Visual material from court filings and exhibits. The default media view hides scanned pages and low-information document graphics.',
  'DOJ Audio Evidence': 'Audio records released in Department of Justice source productions.',
  'DOJ Prison Surveillance':
    'Surveillance footage from the Metropolitan Correctional Center released by the Department of Justice.',
  'DOJ VOL000001':
    'Photographs and visual records catalogued from Department of Justice volume 000001.',
  'Donald Trump':
    'Curated reference images associated with Donald Trump. Album placement supplies research context, not proof of identity or conduct.',
  'Epstein Estate Documents - Seventh Production':
    'Media records from the seventh Epstein estate document production. Scanned pages remain available in the archival view.',
  Evidence:
    'Curated visual evidence without a single source-release collection. Subject tags preserve the original research context.',
  'Evidence Images':
    'Legacy visual evidence imports. Item-level source and verification fields determine evidentiary weight.',
  'Ghislaine Maxwell':
    'Curated reference images associated with Ghislaine Maxwell. Album placement supplies research context, not proof of conduct.',
  'Jeffrey Epstein':
    'Curated reference images associated with Jeffrey Epstein. Item-level records retain source and verification context.',
  MAGA: 'Curated reference images associated with MAGA-related reporting and source material.',
  'Maxwell Proffer':
    'Visual material extracted from the Maxwell proffer documents. Each item links to its source record when available.',
  Perpetrators:
    'Editorial research collection. Item-level sources and verification fields determine evidentiary weight.',
  Properties:
    'Curated photographs of properties relevant to the archive. Location and source details appear on individual records.',
  'Removed by DOJ':
    'Reference copies of material reported as removed or changed in Department of Justice releases. Item-level provenance records the available source.',
  'Sascha Riley (Barros) Testimony':
    'Six-part interview series with Sascha Barros, interviewed by Lisa Noelle Voldeng. Contains descriptions of sexual abuse and trafficking.',
  Survivors:
    'Curated reference images associated with survivor reporting. Use item-level context and source records with care.',
  'Unconfirmed Claims':
    'Material retained for claim review. Inclusion does not verify the claim, image, identity, date, or event.',
  Wired: 'WIRED reporting and archive material about the Epstein Files reading room.',
};

function descriptionForAlbum(name: string, currentDescription: string | null): string {
  const exact = ALBUM_DESCRIPTIONS[name];
  if (exact) return exact;

  if (/^DOJ Data Set \d+$/i.test(name)) {
    return `Visual material extracted from documents in ${name}. Each item retains its source-document position when available.`;
  }
  if (/^DOJ Phase \d+$/i.test(name)) {
    return `Visual material from ${name}. Each item retains its source-document position when available.`;
  }
  if (currentDescription && !/^(?:Images from|Ingested from)\b/i.test(currentDescription)) {
    return currentDescription;
  }
  return `Curated media catalogued in ${name}. Item-level metadata records source and verification context where available.`;
}

async function albumId(client: pg.Client, name: string): Promise<number | null> {
  const result = await client.query<{ id: string }>(
    'SELECT id FROM media_albums WHERE name = $1 ORDER BY id LIMIT 1',
    [name],
  );
  return result.rows[0] ? Number(result.rows[0].id) : null;
}

async function ensureTag(
  client: pg.Client,
  name: string,
  category: ConsolidationRule['tagCategory'],
): Promise<number> {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM media_tags WHERE name = $1 ORDER BY id LIMIT 1',
    [name],
  );
  if (existing.rows[0]) return Number(existing.rows[0].id);

  const created = await client.query<{ id: string }>(
    'INSERT INTO media_tags (name, category) VALUES ($1, $2) RETURNING id',
    [name, category],
  );
  return Number(created.rows[0].id);
}

async function catalogSummary(client: pg.Client): Promise<Record<string, number>> {
  const result = await client.query<{
    albums: string;
    empty_albums: string;
    one_image_albums: string;
    images_missing_context: string;
  }>(`
    WITH album_counts AS (
      SELECT
        a.id,
        COUNT(i.id) AS item_count,
        COUNT(i.id) FILTER (WHERE i.file_type LIKE 'image/%') AS image_count
      FROM media_albums a
      LEFT JOIN media_items i ON i.album_id = a.id
      GROUP BY a.id
    )
    SELECT
      COUNT(*) AS albums,
      COUNT(*) FILTER (WHERE item_count = 0) AS empty_albums,
      COUNT(*) FILTER (WHERE image_count = 1) AS one_image_albums,
      (
        SELECT COUNT(*)
        FROM media_items
        WHERE file_type LIKE 'image/%'
          AND NULLIF(BTRIM(COALESCE(description, '')), '') IS NULL
      ) AS images_missing_context
    FROM album_counts
  `);
  const row = result.rows[0];
  return {
    albums: Number(row.albums),
    emptyAlbums: Number(row.empty_albums),
    oneImageAlbums: Number(row.one_image_albums),
    imagesMissingContext: Number(row.images_missing_context),
  };
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    const before = await catalogSummary(client);
    const plannedMerges: Array<{ source: string; target: string; items: number }> = [];
    let movedItems = 0;
    let descriptionsAdded = 0;
    let albumDescriptionsUpdated = 0;
    let emptyAlbumsDeleted = 0;

    for (const rule of CONSOLIDATION_RULES) {
      const sourceAlbumId = await albumId(client, rule.source);
      const targetAlbumId = await albumId(client, rule.target);
      if (sourceAlbumId == null || targetAlbumId == null || sourceAlbumId === targetAlbumId)
        continue;

      const countResult = await client.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM media_items WHERE album_id = $1',
        [sourceAlbumId],
      );
      const itemCount = Number(countResult.rows[0].count);
      plannedMerges.push({ source: rule.source, target: rule.target, items: itemCount });
      if (!apply || itemCount === 0) continue;

      const contextTagId = await ensureTag(client, rule.contextTag, rule.tagCategory);
      await client.query(
        `INSERT INTO media_item_tags (media_item_id, tag_id)
         SELECT id, $1
         FROM media_items
         WHERE album_id = $2
         ON CONFLICT DO NOTHING`,
        [contextTagId, sourceAlbumId],
      );

      const metadataPatch = {
        ...(rule.sourceCollection ? { source_collection: rule.sourceCollection } : {}),
        catalog_context: {
          previousAlbumId: sourceAlbumId,
          previousAlbumName: rule.source,
          consolidatedInto: rule.target,
          reason: rule.reason,
        },
      };
      const update = await client.query(
        `UPDATE media_items
         SET album_id = $1,
             description = COALESCE(NULLIF(BTRIM(description), ''), $2),
             metadata_json = COALESCE(metadata_json, '{}'::jsonb) || $3::jsonb
         WHERE album_id = $4`,
        [targetAlbumId, rule.missingDescription, JSON.stringify(metadataPatch), sourceAlbumId],
      );
      movedItems += update.rowCount ?? 0;
    }

    if (apply) {
      const descriptionUpdate = await client.query(`
        WITH image_context AS (
          SELECT
            i.id,
            a.name AS album_name,
            COALESCE(
              NULLIF(i.metadata_json->>'source_document', ''),
              NULLIF(d.file_name, '')
            ) AS source_document,
            COALESCE(
              NULLIF(i.metadata_json->>'source_collection', ''),
              NULLIF(i.metadata_json->>'sourceCollection', ''),
              NULLIF(d.source_collection, ''),
              a.name
            ) AS source_collection,
            NULLIF(i.metadata_json->>'source_page', '') AS source_page,
            REGEXP_REPLACE(i.file_path, '^.*/', '') AS original_filename,
            CASE i.metadata_json->>'visual_classification'
              WHEN 'probable_photograph' THEN 'Probable photograph'
              WHEN 'document_scan' THEN 'Scanned document page'
              WHEN 'graphic' THEN 'Graphic or document image'
              ELSE 'Archival image'
            END AS visual_type
          FROM media_items i
          JOIN media_albums a ON a.id = i.album_id
          LEFT JOIN documents d ON d.id::text = i.document_id::text
          WHERE i.file_type LIKE 'image/%'
            AND NULLIF(BTRIM(COALESCE(i.description, '')), '') IS NULL
        )
        UPDATE media_items media
        SET description = CASE
          WHEN image_context.source_document IS NOT NULL THEN
            image_context.visual_type || ' from ' || image_context.source_document ||
            CASE
              WHEN image_context.source_page IS NOT NULL
                THEN ', page ' || image_context.source_page
              ELSE ''
            END || '. Collection: ' || image_context.source_collection || '.'
          ELSE
            image_context.visual_type || ' catalogued in ' || image_context.album_name ||
            '. Original file: ' || image_context.original_filename || '.'
        END
        FROM image_context
        WHERE media.id = image_context.id
      `);
      descriptionsAdded = descriptionUpdate.rowCount ?? 0;

      const albums = await client.query<{ id: string; name: string; description: string | null }>(
        'SELECT id, name, description FROM media_albums ORDER BY id',
      );
      for (const album of albums.rows) {
        const description = descriptionForAlbum(album.name, album.description);
        if (description === album.description) continue;
        const update = await client.query(
          `UPDATE media_albums
           SET description = $1, date_modified = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [description, album.id],
        );
        albumDescriptionsUpdated += update.rowCount ?? 0;
      }

      const deleted = await client.query(`
        DELETE FROM media_albums album
        WHERE NOT EXISTS (
          SELECT 1
          FROM media_items item
          WHERE item.album_id = album.id
        )
      `);
      emptyAlbumsDeleted = deleted.rowCount ?? 0;
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }

    const after = apply ? await catalogSummary(client) : null;
    console.log(
      JSON.stringify(
        {
          mode: apply ? 'applied' : 'dry-run',
          before,
          plannedMerges,
          movedItems,
          descriptionsAdded,
          albumDescriptionsUpdated,
          emptyAlbumsDeleted,
          after,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
