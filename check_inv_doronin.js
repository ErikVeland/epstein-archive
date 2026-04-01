import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL is not set in .env');
    return;
  }
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  const res = await client.query(
    "SELECT id, title, status FROM investigations WHERE title ILIKE '%Doronin%'",
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
