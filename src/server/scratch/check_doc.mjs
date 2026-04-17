import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://epstein:epstein@localhost:5435/epstein_archive',
});

async function checkDoc() {
  try {
    const res = await pool.query(
      'SELECT id, file_name, file_path, original_file_path, metadata_json FROM documents WHERE id = 509872',
    );
    console.log('Document:', JSON.stringify(res.rows[0], null, 2));

    const lineageRes = await pool.query(
      'SELECT * FROM documents d LEFT JOIN documents orig ON d.original_file_id = orig.id WHERE d.id = 509872',
    );
    console.log('Lineage Base:', JSON.stringify(lineageRes.rows[0], null, 2));

    const provEvents = await pool.query(
      'SELECT * FROM document_provenance_events WHERE document_id = 509872',
    );
    console.log('Provenance Events Count:', provEvents.rowCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkDoc();
