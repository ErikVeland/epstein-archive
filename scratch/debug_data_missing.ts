import { getApiPool, initPools } from '../src/server/db/connection.js';
import { entitiesRepository } from '../src/server/db/entitiesRepository.js';
import { mediaRepository } from '../src/server/db/mediaRepository.js';
import pkg from 'pg';
const { Pool } = pkg;

async function run() {
  process.env.PG_NUCLEAR_STRICT = '0';
  initPools();
  const pool = getApiPool();

  console.log('--- DIAGNOSTIC START ---');

  // 1. Find Jeffrey Epstein
  const epsteinRes = await pool.query(
    "SELECT id, full_name, mentions, red_flag_rating FROM entities WHERE full_name ILIKE '%Jeffrey Epstein%' LIMIT 1",
  );
  const epstein = epsteinRes.rows[0];

  if (!epstein) {
    console.error('Jeffrey Epstein NOT FOUND in entities table');
    return;
  }

  const id = epstein.id;
  console.log(`Found Entity: ${epstein.full_name} (ID: ${id})`);
  console.log(`Reported Mentions in entities table: ${epstein.mentions}`);

  // 2. Check entity_mentions count
  const mentionsCountRes = await pool.query(
    'SELECT COUNT(*) FROM entity_mentions WHERE entity_id = $1',
    [id],
  );
  console.log(`Actual rows in entity_mentions for ID ${id}: ${mentionsCountRes.rows[0].count}`);

  // 3. Check documents join
  const docsJoinRes = await pool.query(
    `
    SELECT COUNT(DISTINCT d.id) 
    FROM documents d
    INNER JOIN entity_mentions em ON d.id = em.document_id
    WHERE em.entity_id = $1
  `,
    [id],
  );
  console.log(`Actual linked documents: ${docsJoinRes.rows[0].count}`);

  // 4. Check media items
  const mediaCountRes = await pool.query(
    `
    SELECT COUNT(*) 
    FROM media_items m
    LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
    WHERE (m.entity_id = $1 OR mip.entity_id = $1)
  `,
    [id],
  );
  console.log(`Actual linked media items: ${mediaCountRes.rows[0].count}`);

  // 5. Test the repository method directly
  try {
    const docs = await entitiesRepository.getEntityDocumentsPaginated(String(id), 1, 10);
    console.log(`Repository getEntityDocumentsPaginated(ID: ${id}) returned ${docs.length} items.`);
    if (docs.length > 0) {
      console.log('Sample doc ID:', docs[0].id);
    }

    const count = await entitiesRepository.getEntityDocumentCount(String(id));
    console.log(`Repository getEntityDocumentCount(ID: ${id}) returned ${count}.`);
  } catch (err) {
    console.error('Error calling repository methods:', err);
  }

  // 6. Test media repository
  try {
    const media = await mediaRepository.getMediaItems(String(id));
    console.log(`Repository getMediaItems(ID: ${id}) returned ${media.length} items.`);
  } catch (err) {
    console.error('Error calling media repository methods:', err);
  }

  console.log('--- DIAGNOSTIC END ---');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
