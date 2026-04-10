
const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://epstein:epstein@localhost:5435/epstein_archive' });

async function runTest() {
  const entityId = '1'; // Trying canonical Jeffrey Epstein first
  const filters = { search: '', source: 'all', sort: 'relevance' };
  const page = 1;
  const limit = 50;

  // Mirroring entitiesRepository logic roughly
  const id = Number(entityId);
  const offset = (page - 1) * limit;
  const params = [BigInt(id), limit, offset];
  
  const query = `
    SELECT
      em.document_id                          AS id,
      COALESCE(d.title, d.file_name)          AS title,
      d.file_name                             AS file_name,
      d.file_path                             AS file_path,
      d.file_type                             AS file_type,
      d.evidence_type                         AS evidence_type,
      d.date_created                          AS date_created,
      d.red_flag_rating                       AS red_flag_rating,
      d.word_count                            AS word_count,
      d.content_preview                       AS content_preview,
      LEFT(d.content, 500)                    AS content,
      d.metadata_json                         AS metadata_json
    FROM entity_mentions em
    JOIN documents d ON d.id = em.document_id
    WHERE em.entity_id = $1::bigint
    GROUP BY 
      em.document_id,
      d.id, d.title, d.file_name, d.file_path, d.file_type, 
      d.evidence_type, d.date_created, d.red_flag_rating, 
      d.word_count, d.content_preview, d.content, d.metadata_json
    ORDER BY d.date_created DESC NULLS LAST
    LIMIT $2 OFFSET $3
  `;

  try {
    const res = await pool.query(query, params);
    console.log('RESULTS for ID 1:', res.rows.length);
    if (res.rows.length > 0) console.log('FIRST ID:', res.rows[0].id);
  } catch (err) {
    console.error('ERROR for ID 1:', err.message);
  }

  // Try checking which entity has exactly 2,961 documents
  const countQuery = `
    SELECT entity_id, COUNT(DISTINCT document_id) as total
    FROM entity_mentions
    GROUP BY entity_id
    HAVING COUNT(DISTINCT document_id) = 2961
  `;
  try {
    const countRes = await pool.query(countQuery);
    console.log('ENTITIES WITH 2961 DOCS:', countRes.rows);
  } catch (err) {
    console.error('COUNT QUERY ERROR:', err.message);
  }

  pool.end();
}

runTest();
