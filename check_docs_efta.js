import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const eftaIds = [
  'EFTA02426275',
  'EFTA01830170',
  'EFTA00560234',
  'EFTA01979989',
  'EFTA02532822',
  'EFTA02342111',
  'EFTA00493757',
  'EFTA00474296',
  'EFTA02644504'
];

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const res = await client.query('SELECT id, title, file_path FROM documents WHERE title = ANY($1::text[]) OR file_path = ANY($1::text[])', [eftaIds]);
  // Also try partial matches for EFTA IDs
  const query = "SELECT id, title, file_path FROM documents WHERE " + eftaIds.map(id => `title ILIKE '%${id}%' OR file_path ILIKE '%${id}%'`).join(' OR ');
  const res2 = await client.query(query);
  console.log(JSON.stringify(res2.rows, null, 2));
  await client.end();
}

run().catch(console.error);
