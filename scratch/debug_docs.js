const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://epstein:epstein@localhost:5435/epstein_archive',
});

async function checkDocs() {
  try {
    const res = await pool.query(
      'SELECT id, file_path, original_file_path, file_name, metadata_json FROM documents WHERE id IN (509872, 510251)',
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkDocs();
