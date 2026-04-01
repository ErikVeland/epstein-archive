import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const investigationId = 6;
const markdownFile = './vladislav_doronin_investigation.md';

const newEvidence = [
  { eftaId: 'EFTA00741277', docId: 778880, title: 'Capital Group: Kremlin Penthouse Offer', relevance: 'high', notes: 'Doronin\'s head of creative offers Epstein a penthouse across from the Kremlin.' },
  { eftaId: 'EFTA00689980', docId: 807149, title: 'Peter Mandelson: Moscow Property Consultation', relevance: 'high', notes: 'Epstein consults Mandelson on the Moscow property offer.' }
];

const newTimelineEvents = [
  { date: '2009-02-01', title: 'Moscow Penthouse Offer', description: 'Doronin\'s head of creative department offers Epstein a penthouse across from the Kremlin.', type: 'real_estate' },
  { date: '2009-02-15', title: 'Mandelson Property Consultation', description: 'Epstein consults with Peter Mandelson regarding the Moscow property offer.', type: 'social' }
];

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Add Evidence
    for (const doc of newEvidence) {
      // Get document path
      const docRes = await client.query('SELECT file_path FROM documents WHERE id = $1', [doc.docId]);
      const filePath = docRes.rows[0].file_path;

      // Create/Update Evidence
      const evidenceRes = await client.query(
        `INSERT INTO evidence (title, description, source_path, evidence_type) 
         VALUES ($1, $2, $3, 'document') 
         ON CONFLICT (source_path) DO UPDATE SET title = EXCLUDED.title 
         RETURNING id`,
        [doc.title, doc.notes, filePath]
      );
      const evidenceId = evidenceRes.rows[0].id;

      // Link to Investigation
      await client.query(
        `INSERT INTO investigation_evidence (investigation_id, evidence_id, document_id, relevance, notes) 
         VALUES ($1, $2, $3, $4, $5)`,
        [investigationId, evidenceId, doc.docId, doc.relevance, doc.notes]
      );
      console.log(`Linked new evidence: ${doc.eftaId}`);
    }

    // 2. Add Timeline Events
    for (const event of newTimelineEvents) {
      await client.query(
        `INSERT INTO investigation_timeline_events (investigation_id, title, description, type, start_date) 
         VALUES ($1, $2, $3, $4, $5)`,
        [investigationId, event.title, event.description, event.type, event.date]
      );
      console.log(`Added new timeline event: ${event.title}`);
    }

    // 3. Update Notebook
    const markdownContent = fs.readFileSync(markdownFile, 'utf8');
    await client.query(
      `UPDATE investigation_notebook 
       SET annotations_json = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE investigation_id = $2`,
      [
        JSON.stringify([{ id: 'main-report', type: 'markdown', content: markdownContent }]),
        investigationId
      ]
    );
    console.log('Updated investigation notebook with new report content.');

    await client.query('COMMIT');
    console.log('✅ Investigation updated with new supporting evidence.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Update failed:', err);
  } finally {
    await client.end();
  }
}

run();
