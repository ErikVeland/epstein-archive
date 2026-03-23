import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { extractEvidence, scoreCategoryMatch } from './utils/evidence_extractor.js';
import { recalculateRisk } from './recalculate_entity_risk.js';
import { JobManager } from '../src/server/services/JobManager.js';
import os from 'os';
import { getIngestPool } from '../src/server/db/connection.js';

const CHECKPOINT_DIR = './pipeline_checkpoints';
const LIVE_STATUS_FILE = './pipeline_checkpoints/live_status.json';

function writeLiveStatus(fields: Record<string, unknown>) {
  try {
    if (!existsSync(CHECKPOINT_DIR)) mkdirSync(CHECKPOINT_DIR, { recursive: true });
    let current: Record<string, unknown> = {};
    try {
      current = JSON.parse(readFileSync(LIVE_STATUS_FILE, 'utf8'));
    } catch {}
    writeFileSync(
      LIVE_STATUS_FILE,
      JSON.stringify({ ...current, pid: process.pid, ...fields }, null, 2),
    );
  } catch {}
}

let db: any;
let currentResolverRunId: string;

// CONFIGURATION
const BATCH_SIZE = 100;

// Patterns (same as original)
const LOCATION_PATTERN =
  /\b(House|Street|Road|Avenue|Park|Beach|Islands|Drive|Place|Apartment|Mansion|Ranch|Island|Airport|Courthouse|Building|Plaza|Center|Terminal|Hangar|Dock)\b/i;
const HOUSEKEEPER_PATTERN = /Housekeeper/i;
const ORG_PATTERN =
  /\b(Inc\.?|LLC|Corp\.?|Ltd\.?|Group|Trust|Foundation|University|College|School|Academy|Department|Bureau|Agency|Police|Sheriff|FBI|CIA|Secret Service|Bank|Association|Club|Holdings|Limited|Fund|Service|Office|Registry|Commission|Board)\b/i;
const MEDIA_PATTERN =
  /\b(New York Times|Post|News|Press|Journal|Magazine|Broadcast|Radio|TV|Herald|Tribune|Chronicle)\b/i;
const FINANCIAL_PATTERN =
  /\b(Bank|Financial|Transfer|Payment|Account|Trust|LLC|Inc|Corp|Investment|Capital|Securities|Fund|Equity)\b/i;
const PERSON_TITLE_PATTERN =
  /\b(Judge|Officer|Agent|Senator|Representative|Justice|Professor|Doctor|Advocate|Counsel|Attorney|Lawyer|Pilot|Detective|Marshal|Sheriff|Foreman|Owner)\b/i;

const ROLE_PATTERNS = [
  { role: 'Pilot', regex: /\bpilot|aviation|flight|cockpit\b/i },
  { role: 'Survivor', regex: /\bsurvivor|victim|accuser|whistleblower\b/i },
  { role: 'Butler', regex: /\bbutler|housekeeper|maid|staff|employee\b/i },
  { role: 'Lawyer', regex: /\blawyer|attorney|counsel|legal|prosecutor|defense\b/i },
  { role: 'Associate', regex: /\bassociate|partner|colleague|friend|confidant\b/i },
  { role: 'Political', regex: /\bsenator|representative|congress|governor|president|mayor\b/i },
  { role: 'Judicial', regex: /\bjudge|justice|magistrate|court\b/i },
  { role: 'Security', regex: /\bsecurity|guard|officer|agent|police|fbi|cia\b/i },
];

const INTEREST_PATTERNS = [
  { regex: /explicit|child|illegal/i, reason: 'Potentially sensitive keywords' },
  { regex: /password|secret|key/i, reason: 'Potentially leaked credentials' },
];

const CREDENTIAL_PATTERNS = [
  { type: 'Password', regex: /password[:=]\s*([a-zA-Z0-9!@#$%^&*()_+]{4,})/i },
  { type: 'API Key', regex: /(?:api[_-]?key|access[_-]?token)[:=]\s*([a-zA-Z0-9-_.]{16,})/i },
  { type: 'Bank Account', regex: /\b(?:account[_-]?number|iban|routing)[:=]\s*([A-Z0-9-]{8,})\b/i },
];

const CONTACT_PATTERNS = {
  email:
    /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g,
  phone: /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})/g,
};

const UNRESOLVED_WRAPPER_ENTITY_PATTERN =
  /^(?:dear|dearest|defendant|defendants|plaintiff|plaintiffs|watch|watching|philanthropy)\b|\b(?:to|from)\s*$/i;

import {
  ENTITY_BLACKLIST as _ENTITY_BLACKLIST,
  ENTITY_BLACKLIST_REGEX,
  ENTITY_PARTIAL_BLOCKLIST,
} from '../src/config/entityBlacklist.js';
import { isJunkEntity } from './filters/entityFilters.js';
import { resolveAmbiguity } from './filters/contextRules.js';
import { resolveVip, VIP_RULES } from './filters/vipRules.js';
import { fileURLToPath } from 'url';
import { BoilerplateService } from '../src/server/services/BoilerplateService.js';
import { TextCleaner } from './utils/text_cleaner.js';

function normalizeName(name: string): string {
  return name
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^['"]|['"]$/g, '')
    .replace(/[.,;:]$/g, '')
    .trim();
}

async function extractCredentials(doc: any, content: string) {
  for (const pattern of CREDENTIAL_PATTERNS) {
    const regex = new RegExp(pattern.regex, 'gi');
    const matches = [...content.matchAll(regex)];
    for (const match of matches) {
      if (match[1]) {
        await db.query(
          `INSERT INTO black_book_entries (entry_text, notes, document_id, entry_category, created_at)
           VALUES ($1, $2, $3, 'credential', CURRENT_TIMESTAMP)`,
          [
            `⭐ ${pattern.type}: ${match[1]}`,
            `[CREDENTIAL] Extracted from document ${doc.id} (${doc.file_name})`,
            doc.id,
          ],
        );
      }
    }
  }
}

async function harvestContacts(doc: any, content: string, entitiesFound: any[]) {
  for (const entity of entitiesFound) {
    if (entity.type !== 'Person') continue;
    const nameRegex = new RegExp(entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let match;
    while ((match = nameRegex.exec(content)) !== null) {
      const idx = match.index;
      const window = content.substring(idx, idx + 200);
      const emails = [...window.matchAll(CONTACT_PATTERNS.email)];
      const phones = [...window.matchAll(CONTACT_PATTERNS.phone)];

      for (const emailMatch of emails) {
        const email = emailMatch[0];
        const existing = (
          await db.query(
            'SELECT id FROM black_book_entries WHERE document_id = $1 AND entry_text LIKE $2',
            [doc.id, `%${email}%`],
          )
        ).rows[0];
        if (!existing) {
          await db.query(
            `INSERT INTO black_book_entries (person_id, entry_text, notes, document_id, entry_category, created_at)
             VALUES ($1, $2, $3, $4, 'contact', CURRENT_TIMESTAMP)`,
            [
              entity.entityId || null,
              `⭐ ${entity.name} (Contact): ${email}`,
              `[HARVESTED] Found near name in document ${doc.id}`,
              doc.id,
            ],
          );
        }
      }
      for (const phoneMatch of phones) {
        const phone = phoneMatch[0];
        const existing = (
          await db.query(
            'SELECT id FROM black_book_entries WHERE document_id = $1 AND entry_text LIKE $2',
            [doc.id, `%${phone}%`],
          )
        ).rows[0];
        if (!existing) {
          await db.query(
            `INSERT INTO black_book_entries (person_id, entry_text, notes, document_id, entry_category, created_at)
             VALUES ($1, $2, $3, $4, 'contact', CURRENT_TIMESTAMP)`,
            [
              entity.entityId || null,
              `⭐ ${entity.name} (Contact): ${phone}`,
              `[HARVESTED] Found near name in document ${doc.id}`,
              doc.id,
            ],
          );
        }
      }
    }
  }
}

function makeId(): string {
  return crypto.randomUUID();
}

export async function runIntelligencePipeline() {
  console.log('🚀 Starting ULTIMATE Evidentiary Ingestion Pipeline (PG NATIVE)...');
  db = getIngestPool();

  let totalEntities = 0;
  let totalMentions = 0;
  const ingestRunId = makeId();
  currentResolverRunId = ingestRunId;

  try {
    const gitCommit = execSync('git rev-parse HEAD').toString().trim();
    await db.query(
      `INSERT INTO ingest_runs (id, status, git_commit, pipeline_version, agentic_enabled)
       VALUES ($1, 'running', $2, '2.0.0-pg', 0)`,
      [ingestRunId, gitCommit],
    );

    // Resolver run registration
    const res = (
      await db.query(
        'INSERT INTO resolver_runs (resolver_name, resolver_version) VALUES ($1, $2) RETURNING id',
        ['UltimateIngestionPipeline', '2.0.0-pg'],
      )
    ).rows[0];
    const currentResolverRunTableId = res.id;

    // SQL strings for high-throughput loops
    const insertEntitySql = `
      INSERT INTO entities (full_name, type, risk_level, evidence_count, created_at)
      VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (full_name, type) DO NOTHING
      RETURNING id
    `;

    const insertMentionSql = `
      INSERT INTO entity_mentions (id, entity_id, document_id, surface_text, mention_context, confidence, ingest_run_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
    `;

    const updateEvidenceCountSql = `
        UPDATE entities SET evidence_count = evidence_count + 1 WHERE id = $1
    `;

    // documents that need intelligence processing
    // Resume Logic: Check for documents that haven't been processed by a successful run
    // OR just process everything but rely on ON CONFLICT?
    // Better: Add a tracking table or flag on documents.
    // For now, let's just grab all documents.
    // OPTIMIZATION: In a real resume scenario, we'd filter out docs already present in entity_mentions for this pipeline version.

    // Always skip documents that already have entity mentions — prevents re-processing on any restart.
    const processedDocIds = new Set<number>();
    const processed = await db.query(`SELECT DISTINCT document_id FROM entity_mentions`);
    processed.rows.forEach((r: any) => processedDocIds.add(Number(r.document_id)));
    console.log(`   Skipping ${processedDocIds.size} already-processed documents.`);

    const docs = (
      await db.query(`
      SELECT id, content, file_name, source_collection, metadata_json
      FROM documents
      WHERE content IS NOT NULL
        AND (processing_status = 'succeeded' OR processing_status = 'completed')
      ORDER BY id ASC
    `)
    ).rows.filter((d: any) => !processedDocIds.has(Number(d.id)));

    const totalDocs = docs.length;
    console.log(`   Found ${totalDocs} documents for intelligence extraction.`);

    writeLiveStatus({
      running: true,
      phase: 'Intelligence',
      crashed: false,
      intelTotal: totalDocs,
      intelProcessed: 0,
    });

    for (let docIdx = 0; docIdx < docs.length; docIdx++) {
      const doc = docs[docIdx];
      const content = doc.content;
      if (!content || content.length < 10) continue;

      const entitiesFound: any[] = [];

      // 1. Extract Potential Names (Capitalized Words Sequence)
      // e.g. "Donald Trump", "Jeffrey Epstein", "Ghislaine Maxwell"
      // Avoids single words to reduce noise, unless they are very specific known mononyms (which we'll skip for now)
      const nameRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
      let match;
      while ((match = nameRegex.exec(content)) !== null) {
        const name = match[1];
        if (name.length < 4) continue;
        if (isJunkEntity(name)) continue;

        // Basic classification heuristic
        let type = 'Person'; // Default
        if (ORG_PATTERN.test(name)) type = 'Organization';
        else if (LOCATION_PATTERN.test(name)) type = 'Location';
        else if (FINANCIAL_PATTERN.test(name)) type = 'Financial';
        else if (MEDIA_PATTERN.test(name)) type = 'Media';

        entitiesFound.push({
          name: normalizeName(name),
          type,
          offset: match.index,
          original: name,
        });
      }

      // 2. Extract Specific Patterns
      // Credentials, etc. are handled by extractCredentials below,
      // but let's look for specific roles/titles + Name
      // e.g. "Pilot Dave", "Judge Berman"
      const titleRegex = new RegExp(
        `(${PERSON_TITLE_PATTERN.source})\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`,
        'gi',
      );
      while ((match = titleRegex.exec(content)) !== null) {
        const title = match[1];
        const name = match[2];
        if (!isJunkEntity(name)) {
          entitiesFound.push({
            name: normalizeName(name),
            type: 'Person',
            offset: match.index,
            original: match[0],
            notes: `Title: ${title}`,
          });
        }
      }

      for (const ent of entitiesFound) {
        let finalEnt = ent;

        // Resolve VIPs
        // resolveVip returns string | null (the canonical name)
        const vip = resolveVip(ent.name);
        if (vip) {
          finalEnt.name = vip;
          finalEnt.type = 'Person';
        }

        if (!vip && UNRESOLVED_WRAPPER_ENTITY_PATTERN.test(ent.name)) continue;

        // Apply filters after VIP consolidation so recoverable wrappers collapse
        // into the correct canonical entity instead of being stored as junk.
        if (isJunkEntity(finalEnt.name)) continue;

        // Insert/Find Entity
        let entityId: number;
        const existing = (
          await db.query('SELECT id FROM entities WHERE full_name = $1 AND type = $2', [
            finalEnt.name,
            finalEnt.type,
          ])
        ).rows[0];
        if (existing) {
          entityId = existing.id;
          await db.query(updateEvidenceCountSql, [entityId]);
        } else {
          const result = (await db.query(insertEntitySql, [finalEnt.name, finalEnt.type, 'low']))
            .rows[0];
          if (result) {
            entityId = result.id;
          } else {
            // Conflict handled, fetch id
            const refetch = (
              await db.query('SELECT id FROM entities WHERE full_name = $1 AND type = $2', [
                finalEnt.name,
                finalEnt.type,
              ])
            ).rows[0];
            entityId = refetch.id;
          }
        }

        // Insert Mention
        await db.query(insertMentionSql, [
          makeId(),
          entityId,
          doc.id,
          finalEnt.name,
          content.substring(Math.max(0, ent.offset - 50), ent.offset + 100),
          0.9,
          ingestRunId,
        ]);

        totalMentions++;
        ent.entityId = entityId;
      }

      await extractCredentials(doc, content);
      await harvestContacts(doc, content, entitiesFound);

      // Write live status every 25 docs so the widget shows real-time progress
      if (docIdx % 25 === 0) {
        writeLiveStatus({
          currentFile: doc.file_name || `doc:${doc.id}`,
          currentCollection: doc.source_collection || 'Unknown',
          intelProcessed: docIdx + 1,
          intelTotal: totalDocs,
        });
      }
    }

    await db.query(
      "UPDATE ingest_runs SET status = 'completed', finished_at = CURRENT_TIMESTAMP WHERE id = $1",
      [ingestRunId],
    );
    writeLiveStatus({
      currentFile: null,
      currentCollection: null,
      intelProcessed: totalDocs,
      intelTotal: totalDocs,
    });
    console.log('✅ Intelligence Pipeline complete.');
  } catch (error) {
    console.error('❌ Intelligence Pipeline failed:', error);
    await db.query("UPDATE ingest_runs SET status = 'failed', error_message = $1 WHERE id = $2", [
      (error as Error).message,
      ingestRunId,
    ]);
    throw error;
  }
}

import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIntelligencePipeline().catch(console.error);
}
