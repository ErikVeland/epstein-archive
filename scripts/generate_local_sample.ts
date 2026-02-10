import Database from 'better-sqlite3';
import crypto from 'crypto';
import {
  existsSync,
  readFileSync,
  statSync,
  unlinkSync,
  copyFileSync,
  writeFileSync,
  appendFileSync,
} from 'fs';
import { join, resolve, relative, basename, extname, dirname } from 'path';
import { globSync } from 'glob';
import { simpleParser } from 'mailparser';
import { convert } from 'html-to-text';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule;

const SAMPLE_DB_PATH = process.env.SAMPLE_DB_PATH || 'sample.db';
const SOURCE_DIR = process.env.SAMPLE_SOURCE_DIR || 'data/originals';
const SCHEMA_PATH = process.env.SCHEMA_PATH || 'schema.sql';
const MAX_DOCS = Number(process.env.SAMPLE_DOC_LIMIT || 25);
const LOG_PATH = process.env.SAMPLE_LOG_PATH || 'sample_db.log';

interface ParsedDocument {
  filePath: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  mtimeISO: string;
  text: string;
  pageCount: number;
}

interface MentionCandidate {
  name: string;
  position: number;
  context: string;
  page: number;
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string | undefined }[];
    return rows.some((r) => r?.name === column);
  } catch {
    return false;
  }
}

function ensureColumn(db: Database.Database, table: string, column: string, definition: string) {
  if (hasColumn(db, table, column)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    console.log(`🔧 Ajout de la colonne ${table}.${column}`);
  } catch (error) {
    console.warn(`⚠️  Impossible d'ajouter ${table}.${column}:`, (error as Error).message);
  }
}

function ensureTable(db: Database.Database, table: string, createSql: string) {
  try {
    db.exec(createSql);
    console.log(`🔧 Table ${table} vérifiée/créée`);
  } catch (error) {
    console.warn(`⚠️  Impossible de créer ${table}:`, (error as Error).message);
  }
}

function logSampleEvent(
  filePath: string,
  status: 'parsed' | 'skipped' | 'failed',
  entityCount: number,
) {
  const line = `${new Date().toISOString()}\t${filePath}\t${status}\tentities=${entityCount}\n`;
  appendFileSync(LOG_PATH, line);
}

(async () => {
  const sourceRoot = resolve(process.cwd(), SOURCE_DIR);
  if (!existsSync(sourceRoot)) {
    console.error(`❌ Source directory not found: ${sourceRoot}`);
    process.exit(1);
  }

  const schemaPath = resolve(process.cwd(), SCHEMA_PATH);
  if (!existsSync(schemaPath)) {
    console.error(`❌ schema.sql introuvable à ${schemaPath}`);
    process.exit(1);
  }

  const matches = globSync('**/*.{pdf,txt,eml}', { cwd: sourceRoot, nodir: true })
    .map((p) => join(sourceRoot, p))
    .slice(0, MAX_DOCS);

  if (matches.length === 0) {
    console.error('❌ Aucun document détecté dans le dossier source.');
    process.exit(1);
  }

  writeFileSync(
    LOG_PATH,
    `Sample DB generation started at ${new Date().toISOString()} — source dir: ${sourceRoot}\n`,
  );

  if (existsSync(SAMPLE_DB_PATH)) {
    const backupPath = `${SAMPLE_DB_PATH}.${Date.now()}.bak`;
    copyFileSync(SAMPLE_DB_PATH, backupPath);
    unlinkSync(SAMPLE_DB_PATH);
    console.log(`🗄️  Ancien sample.db sauvegardé sous ${backupPath}`);
  }

  const db = new Database(SAMPLE_DB_PATH);
  const schemaSql = readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSql);
  console.log(`📚 Schéma appliqué à ${SAMPLE_DB_PATH}`);

  ensureColumn(db, 'investigations', 'collaborator_ids', "TEXT DEFAULT '[]'");
  ensureColumn(db, 'investigations', 'scope', 'TEXT');
  ensureTable(
    db,
    'media_item_people',
    `
      CREATE TABLE IF NOT EXISTS media_item_people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_item_id INTEGER NOT NULL,
        entity_id INTEGER NOT NULL,
        confidence REAL,
        role TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_media_item_people_entity ON media_item_people(entity_id);
      CREATE INDEX IF NOT EXISTS idx_media_item_people_media ON media_item_people(media_item_id);
    `,
  );
  ensureTable(
    db,
    'black_book_entries',
    `
      CREATE TABLE IF NOT EXISTS black_book_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER,
        entry_text TEXT,
        phone_numbers TEXT,
        addresses TEXT,
        email_addresses TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (person_id) REFERENCES entities(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_black_book_person ON black_book_entries(person_id);
    `,
  );

  const insertDocument = db.prepare(`
    INSERT INTO documents (
      file_name, file_path, file_type, file_size, date_created, date_modified,
      content_preview, evidence_type, mentions_count, content, metadata_json,
      word_count, spice_rating, content_hash, original_file_path, created_at,
      title, source_collection, red_flag_rating, type, page_count, analyzed_at
    ) VALUES (
      @file_name, @file_path, @file_type, @file_size, @date_created, @date_modified,
      @content_preview, @evidence_type, @mentions_count, @content, @metadata_json,
      @word_count, @spice_rating, @content_hash, @original_file_path, @created_at,
      @title, @source_collection, @red_flag_rating, @type, @page_count, @analyzed_at
    )
  `);

  const selectEntity = db.prepare('SELECT id FROM entities WHERE full_name = ?');
  const insertEntity = db.prepare(`
    INSERT INTO entities (
      full_name, primary_role, created_at, updated_at, entity_type, type, risk_factor
    ) VALUES (?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Person', 'Person', 0)
  `);
  const updateEntityMentions = db.prepare(
    'UPDATE entities SET mentions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  );
  const insertMention = db.prepare(`
    INSERT INTO entity_mentions (
      entity_id, document_id, mention_context, mention_type, page_number,
      position_in_text, context_type, context_text, keyword, position_start,
      position_end, significance_score, assigned_by
    ) VALUES (
      @entity_id, @document_id, @mention_context, 'auto', @page_number,
      @position_in_text, 'auto', @context_text, @keyword, @position_start,
      @position_end, 1, 'generate_local_sample'
    )
  `);

  const entityCache = new Map<string, number>();
  const mentionAccumulator = new Map<number, number>();

  const upsertEntity = (name: string): number => {
    if (entityCache.has(name)) return entityCache.get(name)!;
    const existing = selectEntity.get(name) as { id: number } | undefined;
    if (existing) {
      entityCache.set(name, existing.id);
      return existing.id;
    }
    const result = insertEntity.run(name);
    const entityId = Number(result.lastInsertRowid);
    entityCache.set(name, entityId);
    return entityId;
  };

  const processDocTx = db.transaction((doc: ParsedDocument, mentions: MentionCandidate[]) => {
    const words = doc.text.trim().split(/\s+/).filter(Boolean);
    const metadata = {
      source_path: doc.relativePath,
      source_directory: dirname(doc.relativePath),
      generator: 'generate_local_sample.ts',
    };
    const contentHash = crypto.createHash('md5').update(doc.text).digest('hex');
    const info = insertDocument.run({
      file_name: doc.fileName,
      file_path: doc.relativePath,
      file_type: doc.mimeType,
      file_size: doc.size,
      date_created: doc.mtimeISO,
      date_modified: doc.mtimeISO,
      content_preview: doc.text.slice(0, 600),
      evidence_type: 'Document',
      mentions_count: mentions.length,
      content: doc.text,
      metadata_json: JSON.stringify(metadata),
      word_count: words.length,
      spice_rating: null,
      content_hash: contentHash,
      original_file_path: doc.relativePath,
      created_at: new Date().toISOString(),
      title: doc.fileName.replace(/\.[^.]+$/, ''),
      source_collection: dirname(doc.relativePath) || 'local-sample',
      red_flag_rating: 0,
      type: 'document',
      page_count: doc.pageCount,
      analyzed_at: new Date().toISOString(),
    });

    const documentId = Number(info.lastInsertRowid);

    for (const mention of mentions) {
      const entityId = upsertEntity(mention.name);
      insertMention.run({
        entity_id: entityId,
        document_id: documentId,
        mention_context: mention.context,
        page_number: mention.page,
        position_in_text: mention.position,
        context_text: mention.context,
        keyword: mention.name,
        position_start: mention.position,
        position_end: mention.position + mention.name.length,
      });
      mentionAccumulator.set(entityId, (mentionAccumulator.get(entityId) || 0) + 1);
    }
  });

  for (const absolutePath of matches) {
    const parsed = await parseDocument(absolutePath);
    if (!parsed || !parsed.text.trim()) {
      console.warn(`⚠️  Impossible d'extraire le texte de ${absolutePath}, ignoré.`);
      logSampleEvent(relative(process.cwd(), absolutePath), 'skipped', 0);
      continue;
    }
    const mentions = extractEntities(parsed.text, parsed.pageCount);
    processDocTx(parsed, mentions);
    console.log(`✅ Ingesté ${parsed.fileName} (${mentions.length} entités détectées)`);
    logSampleEvent(parsed.relativePath, 'parsed', mentions.length);
  }

  for (const [entityId, count] of mentionAccumulator.entries()) {
    updateEntityMentions.run(count, entityId);
  }

  const docTotal = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
  const entityTotal = db.prepare('SELECT COUNT(*) as count FROM entities').get() as {
    count: number;
  };
  console.log(`🎉 Sample prêt: ${docTotal.count} documents, ${entityTotal.count} entités.`);
  appendFileSync(
    LOG_PATH,
    `Run completed at ${new Date().toISOString()} — documents=${docTotal.count}, entities=${entityTotal.count}\n`,
  );
  db.close();
})();

async function parseDocument(filePath: string): Promise<ParsedDocument | null> {
  const fileName = basename(filePath);
  const relativePath = relative(process.cwd(), filePath);
  const stats = statSync(filePath);
  const ext = extname(fileName).toLowerCase();
  const buffer = readFileSync(filePath);

  if (ext === '.pdf') {
    try {
      const parser = new PDFParse(new Uint8Array(buffer));
      const textData = await parser.getText();
      const info = await parser.getInfo();
      return {
        filePath,
        relativePath,
        fileName,
        mimeType: 'application/pdf',
        size: stats.size,
        mtimeISO: stats.mtime.toISOString(),
        text: textData?.text || '',
        pageCount: info?.numpages || 0,
      };
    } catch (error) {
      console.warn(`⚠️  Lecture PDF impossible pour ${fileName}:`, (error as Error).message);
      return null;
    }
  }

  if (ext === '.eml') {
    const parsed = await simpleParser(buffer);
    let body = parsed.text || '';
    if (!body && parsed.html) {
      body = convert(parsed.html, { wordwrap: 120 });
    }
    return {
      filePath,
      relativePath,
      fileName,
      mimeType: 'message/rfc822',
      size: stats.size,
      mtimeISO: stats.mtime.toISOString(),
      text: body,
      pageCount: 1,
    };
  }

  return {
    filePath,
    relativePath,
    fileName,
    mimeType: 'text/plain',
    size: stats.size,
    mtimeISO: stats.mtime.toISOString(),
    text: buffer.toString('utf-8'),
    pageCount: 1,
  };
}

function extractEntities(text: string, pageCount: number): MentionCandidate[] {
  const pattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const matches = new Map<string, { count: number; position: number }>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null && matches.size < 50) {
    const name = match[1].trim();
    if (name.length < 5 || name.length > 60) continue;
    if (name.toLowerCase().includes('http')) continue;
    if (!matches.has(name)) {
      matches.set(name, { count: 1, position: match.index });
    } else {
      matches.get(name)!.count += 1;
    }
  }

  const candidates = Array.from(matches.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, info]) => {
      const snippetStart = Math.max(0, info.position - 120);
      const snippetEnd = Math.min(text.length, info.position + 120);
      const context = text.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim();
      const pageGuess =
        pageCount > 0
          ? Math.min(
              pageCount,
              Math.max(1, Math.floor((info.position / text.length) * pageCount) + 1),
            )
          : 1;
      return {
        name,
        position: info.position,
        context,
        page: pageGuess,
      };
    });

  return candidates;
}
