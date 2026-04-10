#!/usr/bin/env tsx

import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://epstein:epstein@localhost:5435/epstein_archive',
});

const transcriptPath =
  'data/media/videos/Sasha Riley TikTok Q&A/sasha-riley-tiktok-qa-transcript.txt';
const transcript = fs.readFileSync(transcriptPath, 'utf-8');

async function main() {
  const client = await pool.connect();
  try {
    // First check the current metadata
    const result = await client.query(
      'SELECT id, metadata_json FROM media_items WHERE file_path LIKE $1',
      ['%Sasha Riley TikTok Q&A%'],
    );
    console.log('Current metadata:', result.rows);

    // Update with transcript
    const newMetadata = { transcript };
    await client.query('UPDATE media_items SET metadata_json = $1::jsonb WHERE file_path LIKE $2', [
      JSON.stringify(newMetadata),
      '%Sasha Riley TikTok Q&A%',
    ]);

    console.log('Updated transcript');

    // Verify
    const verify = await client.query(
      'SELECT metadata_json FROM media_items WHERE file_path LIKE $1',
      ['%Sasha Riley TikTok Q&A%'],
    );
    console.log('Updated metadata:', verify.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
