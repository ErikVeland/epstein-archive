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

  // 1. Check for existing evidence
  const evidenceQuery = `SELECT id, title, source_path FROM evidence WHERE ${eftaIds.map(id => `source_path ILIKE '%${id}%'`).join(' OR ')}`;
  const evidenceRes = await client.query(evidenceQuery);
  const existingEvidence = evidenceRes.rows;

  // 2. Map EFTA IDs to evidence records or documents
  // If evidence doesn't exist, we might need to create it from the documents table
  const missingEfta = eftaIds.filter(id => !existingEvidence.some(e => e.source_path.includes(id)));

  if (missingEfta.length > 0) {
      console.log('Missing in evidence table, checking documents table:', missingEfta);
      const docsQuery = `SELECT id, title, file_path FROM documents WHERE ${missingEfta.map(id => `file_path ILIKE '%${id}%'`).join(' OR ')}`;
      const docsRes = await client.query(docsQuery);
      console.log('Found in documents table:', JSON.stringify(docsRes.rows, null, 2));
  } else {
      console.log('All EFTA IDs found in evidence table.');
  }

  console.log('Existing Evidence:', JSON.stringify(existingEvidence, null, 2));

  await client.end();
}

run().catch(console.error);
