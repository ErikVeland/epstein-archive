import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const eftaIds = [
  'EFTA01979989',
  'EFTA02644504'
];

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const query = "SELECT id, title, file_path FROM documents WHERE " + eftaIds.map(id => `title ILIKE '%${id}%' OR file_path ILIKE '%${id}%'`).join(' OR ');
  const res = await client.query(query);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
