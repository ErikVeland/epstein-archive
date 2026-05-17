import { getApiPool } from '../src/server/db/connection.js';
import 'dotenv/config';

interface VIPEntity {
  id: string;
  full_name: string;
  entity_type: string;
  primary_role: string;
  mentions: number;
  evidence_count: number;
  risk_level: string;
}

interface Relationship {
  source_entity: string;
  target_entity: string;
  relationship_type: string;
  strength: number;
  confidence: number;
}

interface CoMention {
  doc_id: string;
  doc_name: string;
  evidence_type: string;
  epstein_page: number;
  epstein_mention: string;
  maxwell_page: number;
  maxwell_mention: string;
  context_snippet: string;
}

async function main() {
  const pool = getApiPool();
  console.log('\n======================================================');
  console.log('         DEEP FORENSIC NETWORK & GRAPH SEARCH         ');
  console.log('======================================================\n');

  // 1. Query Top VIP Entities
  console.log('⚡ Querying Central VIP Entities...');
  const vipRes = await pool.query<VIPEntity>(`
    SELECT id::text, full_name, entity_type, primary_role, mentions, evidence_count, risk_level
    FROM entities
    WHERE is_vip = 1 AND quarantine_status = 0
    ORDER BY mentions DESC, evidence_count DESC
    LIMIT 10
  `);

  console.log('\n📊 TOP 10 VIP ENTITIES IN THE ARCHIVE:');
  console.table(
    vipRes.rows.map((row) => ({
      ID: row.id,
      Name: row.full_name,
      Role: row.primary_role || 'Unknown',
      Mentions: row.mentions,
      Evidence: row.evidence_count,
      Risk: row.risk_level || 'Medium',
    })),
  );

  // 2. Query Strongest Graph Connections
  console.log('\n⚡ Analyzing Graph Relationship Strengths...');
  const relRes = await pool.query<Relationship>(`
    SELECT
      e1.full_name AS source_entity,
      e2.full_name AS target_entity,
      r.relationship_type,
      r.strength::real AS strength,
      r.confidence::real AS confidence
    FROM entity_relationships r
    JOIN entities e1 ON e1.id = r.source_entity_id
    JOIN entities e2 ON e2.id = r.target_entity_id
    WHERE e1.quarantine_status = 0 AND e2.quarantine_status = 0
      AND e1.full_name <> e2.full_name
    ORDER BY r.strength DESC, r.confidence DESC
    LIMIT 10
  `);

  console.log('\n🕸️ TOP 10 STRONGEST Graph CONNECTIONS:');
  console.table(
    relRes.rows.map((row) => ({
      'Source Entity': row.source_entity,
      'Target Entity': row.target_entity,
      Type: row.relationship_type,
      Strength: row.strength.toFixed(2),
      Confidence: row.confidence.toFixed(2),
    })),
  );

  // 3. Query Co-Mentions of Jeffrey Epstein and Ghislaine Maxwell
  console.log('\n⚡ Executing Co-Mention Context Mining...');
  const coRes = await pool.query<CoMention>(`
    WITH epstein_docs AS (
      SELECT DISTINCT em.document_id, em.surface_text, em.mention_context, em.page_number
      FROM entity_mentions em
      JOIN entities e ON e.id = em.entity_id
      WHERE e.full_name ILIKE '%epstein%' AND e.quarantine_status = 0
    ),
    maxwell_docs AS (
      SELECT DISTINCT em.document_id, em.surface_text, em.mention_context, em.page_number
      FROM entity_mentions em
      JOIN entities e ON e.id = em.entity_id
      WHERE e.full_name ILIKE '%maxwell%' AND e.quarantine_status = 0
    )
    SELECT
      d.id::text AS doc_id,
      d.file_name AS doc_name,
      d.evidence_type,
      ed.page_number AS epstein_page,
      ed.surface_text AS epstein_mention,
      md.page_number AS maxwell_page,
      md.surface_text AS maxwell_mention,
      LEFT(md.mention_context, 80) AS context_snippet
    FROM documents d
    JOIN epstein_docs ed ON ed.document_id = d.id
    JOIN maxwell_docs md ON md.document_id = d.id
    ORDER BY d.id ASC
    LIMIT 5
  `);

  console.log('\n📁 CO-MENTION EVIDENTIARY LOCATIONS (Jeffrey Epstein & Ghislaine Maxwell):');
  for (const row of coRes.rows) {
    console.log(`\n• Document ID ${row.doc_id}: "${row.doc_name}" [Type: ${row.evidence_type}]`);
    console.log(`  - Epstein Mention on Page ${row.epstein_page}: "${row.epstein_mention}"`);
    console.log(`  - Maxwell Mention on Page ${row.maxwell_page}: "${row.maxwell_mention}"`);
    console.log(`  - Context Snippet: "...${(row.context_snippet ?? '').trim()}..."`);
  }
  console.log('\n======================================================\n');
}

main().catch((err) => {
  console.error('[forensic_network_search] Fatal error:', err);
  process.exit(1);
});
