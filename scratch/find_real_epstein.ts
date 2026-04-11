import { getApiPool, initPools } from '../src/server/db/connection.js';
import { entitiesRepository } from '../src/server/db/entitiesRepository.js';
import { mediaRepository } from '../src/server/db/mediaRepository.js';

async function run() {
  process.env.PG_NUCLEAR_STRICT = '0';
  initPools();
  const pool = getApiPool();

  console.log('--- FIND REAL EPSTEIN ---');

  const res = await pool.query(
    "SELECT id, full_name, mentions FROM entities WHERE full_name ILIKE '%Jeffrey Epstein%' ORDER BY mentions DESC LIMIT 10",
  );
  console.log('Candidates:', JSON.stringify(res.rows, null, 2));

  if (res.rows.length === 0) {
    console.error('No Jeffrey Epstein candidates found.');
    return;
  }

  const epstein = res.rows[0];
  const id = epstein.id;
  console.log(`Analyzing primary Entity: ${epstein.full_name} (ID: ${id})`);

  // 1. Check entity_mentions count
  const mentionsCountRes = await pool.query(
    'SELECT COUNT(*) FROM entity_mentions WHERE entity_id = $1',
    [id],
  );
  console.log(`Actual rows in entity_mentions for ID ${id}: ${mentionsCountRes.rows[0].count}`);

  // 2. Check documents join
  const docsJoinRes = await pool.query(
    `
    SELECT COUNT(DISTINCT d.id) 
    FROM documents d
    INNER JOIN entity_mentions em ON d.id = em.document_id
    WHERE em.entity_id = $1
  `,
    [id],
  );
  console.log(`Actual linked documents via entity_mentions: ${docsJoinRes.rows[0].count}`);

  // 3. Check media items (direct link)
  const mediaDirectRes = await pool.query(
    `
    SELECT COUNT(*) 
    FROM media_items 
    WHERE entity_id = $1
  `,
    [id],
  );
  console.log(`Directly linked media items: ${mediaDirectRes.rows[0].count}`);

  // 4. Check media items (via media_item_people)
  const mediaPeopleRes = await pool.query(
    `
    SELECT COUNT(*) 
    FROM media_item_people 
    WHERE entity_id = $1
  `,
    [id],
  );
  console.log(`Linked media items via media_item_people: ${mediaPeopleRes.rows[0].count}`);

  // 5. Test repository methods
  try {
    const totalDocs = await entitiesRepository.getEntityDocumentCount(String(id));
    console.log(`Repository getEntityDocumentCount: ${totalDocs}`);

    const mediaItems = await mediaRepository.getMediaItems(String(id));
    console.log(`Repository getMediaItems: ${mediaItems.length}`);
  } catch (err) {
    console.error('Repository test failed:', err);
  }

  console.log('--- END ANALYSIS ---');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
