import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const config = {
  ownerId: 'user-1',
  title: 'Vladislav Doronin: The Russian Connection (Epstein-Trump Bridge)',
  description: 'Examination of Vladislav Doronin\'s role as a potential intermediary between Jeffrey Epstein and Donald Trump, focusing on his real estate interests and elite Russian networking.',
  thesis: 'Vladislav Doronin was an instrumental connection between Epstein and Trump, leveraging his Moscow influence and shared real estate interests across New York, Miami, and Palm Beach.',
  subjectId: 405628,
  markdownFile: './vladislav_doronin_investigation.md'
};

const eftaDocs = [
  { eftaId: 'EFTA02426275', title: 'DOJ Data Set 11: DV Alias Confirmation', relevance: 'high', notes: 'Confirms alias DV as Vladislav Doronin.' },
  { eftaId: 'EFTA01830170', title: 'DOJ Data Set 10: Vladislav Doronin Mention', relevance: 'high', notes: 'Doronin name appearance.' },
  { eftaId: 'EFTA00560234', title: 'DOJ Data Set 9: Vladislav Doronin Mention', relevance: 'high', notes: 'Doronin name appearance.' },
  { eftaId: 'EFTA01979989', title: 'DOJ Data Set 10: Doronin/Epstein/Andrew Socializing', relevance: 'high', notes: 'Record of Doronin, Epstein, and Prince Andrew together.' },
  { eftaId: 'EFTA02532822', title: 'DOJ Data Set 11: Doronin/Epstein/Andrew Socializing', relevance: 'high', notes: 'Record of Doronin, Epstein, and Prince Andrew together.' },
  { eftaId: 'EFTA02342111', title: 'DOJ Data Set 11: Woody Allen/Tom Barrack Circle', relevance: 'medium', notes: 'Shared circles with Woody Allen and Tom Barrack.' },
  { eftaId: 'EFTA00493757', title: 'DOJ Data Set 9: Michael Ferro Correspondence', relevance: 'medium', notes: 'Link to Michael Ferro (Star Island connection).' },
  { eftaId: 'EFTA00474296', title: 'DOJ Data Set 9: Aman Resorts Design Inspiration', relevance: 'medium', notes: 'Epstein uses Aman Resorts as design benchmark.' },
  { eftaId: 'EFTA02644504', title: 'DOJ Data Set 11: Aman Resorts Design Inspiration', relevance: 'medium', notes: 'Epstein uses Aman Resorts as design benchmark.' }
];

const timelineEvents = [
  { date: '2010-02-01', title: 'Businessman of the Year (Russia)', description: 'Doronin wins award at Moscow Kremlin ceremony.', type: 'event' },
  { date: '2010-12-01', title: 'Putin Certificate of Merit', description: 'Putin awards Doronin for tiger conservation.', type: 'event' },
  { date: '2015-01-01', title: 'OKO Group & Aman Resorts Expansion', description: 'Doronin founds OKO Group and takes over Aman Resorts.', type: 'business' },
  { date: '2022-08-01', title: 'Trump Tower NYC Lease', description: 'OKO Group rents office in Trump Tower.', type: 'business' }
];

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Create Investigation
    const invRes = await client.query(
      `INSERT INTO investigations (title, description, owner_id, status, scope) 
       VALUES ($1, $2, $3, 'open', 'full') 
       RETURNING id`,
      [config.title, config.description, config.ownerId]
    );
    const investigationId = invRes.rows[0].id;
    console.log(`Created investigation with ID: ${investigationId}`);

    // 2. Process Evidence
    for (const doc of eftaDocs) {
      // Get document from documents table
      const docRes = await client.query(
        `SELECT id, title, file_path FROM documents WHERE file_path ILIKE $1 LIMIT 1`,
        [`%${doc.eftaId}%`]
      );
      
      if (docRes.rows.length === 0) {
        console.warn(`Could not find document for ${doc.eftaId}`);
        continue;
      }
      
      const document = docRes.rows[0];
      
      // Create Evidence entry if not exists
      const evidenceRes = await client.query(
        `INSERT INTO evidence (title, description, source_path, evidence_type) 
         VALUES ($1, $2, $3, 'document') 
         ON CONFLICT (source_path) DO UPDATE SET title = EXCLUDED.title
         RETURNING id`,
        [doc.title, doc.notes, document.file_path]
      );
      const evidenceId = evidenceRes.rows[0].id;
      
      // Link to Investigation
      await client.query(
        `INSERT INTO investigation_evidence (investigation_id, evidence_id, document_id, relevance, notes) 
         VALUES ($1, $2, $3, $4, $5)`,
        [investigationId, evidenceId, Number(document.id), doc.relevance, doc.notes]
      );
      console.log(`Linked evidence ${doc.eftaId} (Evidence ID: ${evidenceId})`);
    }

    // 3. Create Timeline Events
    for (const event of timelineEvents) {
      await client.query(
        `INSERT INTO investigation_timeline_events (investigation_id, title, description, type, start_date) 
         VALUES ($1, $2, $3, $4, $5)`,
        [investigationId, event.title, event.description, event.type, event.date]
      );
      console.log(`Added timeline event: ${event.title}`);
    }

    // 4. Create Hypothesis
    const hypRes = await client.query(
      `INSERT INTO hypotheses (investigation_id, title, description, status, confidence) 
       VALUES ($1, $2, $3, 'active', 0.8) 
       RETURNING id`,
      [investigationId, 'Epstein-Trump Bridge', config.thesis]
    );
    const hypothesisId = hypRes.rows[0].id;
    console.log(`Created hypothesis with ID: ${hypothesisId}`);

    // Link all evidence to hypothesis
    await client.query(
      `INSERT INTO hypothesis_evidence (hypothesis_id, evidence_id, relevance) 
       SELECT $1, evidence_id, 'supporting' FROM investigation_evidence WHERE investigation_id = $2`,
      [hypothesisId, investigationId]
    );

    // 5. Create Notebook
    const markdownContent = fs.readFileSync(config.markdownFile, 'utf8');
    // For our simplified notebook, we'll store the markdown parts as annotations or just a single block
    await client.query(
      `INSERT INTO investigation_notebook (investigation_id, order_json, annotations_json) 
       VALUES ($1, $2, $3)`,
      [
        investigationId, 
        JSON.stringify(['main-report']), 
        JSON.stringify([{ id: 'main-report', type: 'markdown', content: markdownContent }])
      ]
    );
    console.log('Saved investigation notebook.');

    await client.query('COMMIT');
    console.log('✅ Investigation fully populated in database.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction failed:', err);
  } finally {
    await client.end();
  }
}

run();
