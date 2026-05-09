import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const realMediaPredicate = `
  file_type ILIKE 'image/%'
  OR file_type ILIKE 'video/%'
  OR file_type ILIKE 'audio/%'
`;

async function getOrCreateAlbum(client: pg.Client, name: string): Promise<number> {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM media_albums WHERE name = $1 LIMIT 1',
    [name],
  );
  if (existing.rows[0]) return Number(existing.rows[0].id);

  const created = await client.query<{ id: string }>(
    `INSERT INTO media_albums (name, description)
     VALUES ($1, $2)
     RETURNING id`,
    [name, `Extracted media assets grouped by the ${name} dataset.`],
  );
  return Number(created.rows[0].id);
}

async function getOrCreateTag(client: pg.Client, name: string, category: string): Promise<number> {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM media_tags WHERE name = $1 LIMIT 1',
    [name],
  );
  if (existing.rows[0]) return Number(existing.rows[0].id);

  const created = await client.query<{ id: string }>(
    `INSERT INTO media_tags (name, category)
     VALUES ($1, $2)
     RETURNING id`,
    [name, category],
  );
  return Number(created.rows[0].id);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    const datasets = await client.query<{ dataset: string; media_count: string }>(`
      SELECT dataset, COUNT(*) AS media_count
      FROM (
        SELECT NULLIF(
          COALESCE(metadata_json->>'source_collection', metadata_json->>'sourceCollection'),
          ''
        ) AS dataset
        FROM media_items
        WHERE (${realMediaPredicate})
      ) grouped
      WHERE dataset IS NOT NULL
      GROUP BY dataset
      ORDER BY dataset
    `);

    const extractedTagId = await getOrCreateTag(client, 'extracted-media', 'system');
    const textOnlyTagId = await getOrCreateTag(client, 'text-only-extraction', 'system');
    let moved = 0;
    let tagged = 0;

    for (const row of datasets.rows) {
      const dataset = row.dataset.trim();
      if (!dataset) continue;

      const albumId = await getOrCreateAlbum(client, dataset);
      const datasetTagId = await getOrCreateTag(client, `dataset:${dataset}`, 'dataset');

      const update = await client.query(
        `
        UPDATE media_items
        SET album_id = $1
        WHERE (${realMediaPredicate})
          AND NULLIF(
            COALESCE(metadata_json->>'source_collection', metadata_json->>'sourceCollection'),
            ''
          ) = $2
        `,
        [albumId, dataset],
      );
      moved += update.rowCount ?? 0;

      const tagInsert = await client.query(
        `
        INSERT INTO media_item_tags (media_item_id, tag_id)
        SELECT m.id::text, tag_id
        FROM media_items m
        CROSS JOIN unnest($1::int[]) AS tags(tag_id)
        WHERE (${realMediaPredicate})
          AND NULLIF(
            COALESCE(m.metadata_json->>'source_collection', m.metadata_json->>'sourceCollection'),
            ''
          ) = $2
        ON CONFLICT DO NOTHING
        `,
        [[extractedTagId, datasetTagId], dataset],
      );
      tagged += tagInsert.rowCount ?? 0;
    }

    const textTagInsert = await client.query(
      `
      INSERT INTO media_item_tags (media_item_id, tag_id)
      SELECT id::text, $1
      FROM media_items
      WHERE has_text IS TRUE OR metadata_json->>'is_text_only' = 'true'
      ON CONFLICT DO NOTHING
      `,
      [textOnlyTagId],
    );
    tagged += textTagInsert.rowCount ?? 0;

    await client.query('COMMIT');
    console.log(
      JSON.stringify(
        {
          datasets: datasets.rows.length,
          mediaItemsMoved: moved,
          tagLinksCreated: tagged,
          emptyAlbumsDeleted: 0,
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
