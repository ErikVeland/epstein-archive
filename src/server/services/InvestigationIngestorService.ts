import fs from 'fs';
import { investigationsRepository } from '../db/investigationsRepository.js';
import { getApiPool } from '../db/connection.js';
import { logger } from './Logger.js';

export interface IngestResult {
  investigationId: number;
  addedEvidence: number;
  addedTimelineEvents: number;
  addedHypotheses: number;
  addedLeads: number;
}

/**
 * Standard Investigative Markdown sections the ingestor recognises.
 *
 * See /docs/investigation-report-format.md for the full specification.
 */
export class InvestigationIngestorService {
  // ─── Public API ──────────────────────────────────────────────────────────

  /** Ingest from a file path on disk. */
  static async ingestFromFile(filePath: string, ownerId = 'user-1'): Promise<IngestResult> {
    const content = fs.readFileSync(filePath, 'utf8');
    return InvestigationIngestorService.ingestFromMarkdown(content, ownerId);
  }

  /** Ingest from a raw markdown string. */
  static async ingestFromMarkdown(content: string, ownerId = 'user-1'): Promise<IngestResult> {
    const { title, description } = InvestigationIngestorService.extractHeader(content);
    logger.info({ title }, '[Ingestor] Starting investigation ingestion');

    // 1. Find or create investigation
    let investigation = await investigationsRepository.getInvestigationByTitle(title);
    if (!investigation) {
      investigation = await investigationsRepository.createInvestigation({
        title,
        description,
        ownerId,
      });
      logger.info({ id: investigation!.id, title }, '[Ingestor] Created new investigation');
    } else {
      logger.info({ id: investigation.id, title }, '[Ingestor] Found existing investigation');
    }
    const investigationId = investigation!.id;

    // 2. Evidence — auto-resolve EFTA IDs
    const addedEvidence = await InvestigationIngestorService.syncEvidence(
      investigationId,
      content,
      ownerId,
    );

    // 3. Timeline — refresh each run (delete-and-reinsert for idempotency)
    const addedTimelineEvents = await InvestigationIngestorService.syncTimeline(
      investigationId,
      content,
    );

    // 4. Hypotheses — additive only (do not delete existing ones)
    const addedHypotheses = await InvestigationIngestorService.syncHypotheses(
      investigationId,
      content,
    );

    // 5. Leads — additive only
    const addedLeads = await InvestigationIngestorService.syncLeads(
      investigationId,
      content,
      ownerId,
    );

    // 6. Notebook — always overwrite with latest report content
    await investigationsRepository.saveNotebook(investigationId, {
      order: [1],
      annotations: [{ id: 1, type: 'markdown', content }],
    });

    logger.info(
      { investigationId, addedEvidence, addedTimelineEvents, addedHypotheses, addedLeads },
      '[Ingestor] Ingestion complete',
    );

    return { investigationId, addedEvidence, addedTimelineEvents, addedHypotheses, addedLeads };
  }

  // ─── Parsers ─────────────────────────────────────────────────────────────

  /**
   * Extract the H1 title and the description that follows it
   * (content up to the first ## heading or horizontal rule).
   */
  private static extractHeader(content: string): { title: string; description: string } {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch
      ? titleMatch[1].replace(/^\s*Investigation Report:\s*/i, '').trim()
      : 'Untitled Investigation';

    // Description = paragraphs between H1 and the first H2/---
    const afterH1 = content.replace(/^#[^#].*$/m, '').trim();
    const descBlock = afterH1.split(/^##|^---/m)[0] || '';
    const description = descBlock
      .replace(/^#+.+$/gm, '') // strip any stray headings
      .replace(/^>\s*\[!\w+\].*/gm, '') // strip callouts
      .trim()
      .substring(0, 1000);

    return { title, description };
  }

  /**
   * Find all EFTA IDs in content, resolve to documents table, upsert evidence
   * and link to investigation using raw SQL to satisfy document_id NOT NULL.
   */
  private static async syncEvidence(
    investigationId: number,
    content: string,
    ownerId: string,
  ): Promise<number> {
    const eftaPattern = /EFTA\d{8}/g;
    const ids = Array.from(new Set(content.match(eftaPattern) || []));
    let added = 0;
    const pool = getApiPool();

    for (const eftaId of ids) {
      try {
        // Resolve EFTA to document
        const docRes = await pool.query(
          `SELECT id, title, file_path FROM documents WHERE file_path ILIKE $1 LIMIT 1`,
          [`%${eftaId}%`],
        );
        if (docRes.rows.length === 0) continue;

        const doc = docRes.rows[0];
        const docId = Number(doc.id);
        const title = (doc.title as string) || eftaId;
        const sourcePath = (doc.file_path as string) || `efta:${eftaId}`;

        // Upsert into evidence table
        const evRes = await pool.query(
          `INSERT INTO evidence (title, description, evidence_type, source_path, original_filename, red_flag_rating)
           VALUES ($1, $2, 'document', $3, $4, 0)
           ON CONFLICT (source_path) DO UPDATE SET title = EXCLUDED.title
           RETURNING id`,
          [title, `Linked via ${eftaId}`, sourcePath, eftaId],
        );
        const evidenceId = Number(evRes.rows[0].id);

        // Link to investigation — include document_id to satisfy NOT NULL
        await pool.query(
          `INSERT INTO investigation_evidence (investigation_id, evidence_id, document_id, added_by, relevance)
           VALUES ($1, $2, $3, $4, 'high')
           ON CONFLICT (investigation_id, evidence_id) DO NOTHING`,
          [investigationId, evidenceId, docId, ownerId],
        );
        added++;
      } catch (err) {
        logger.warn({ eftaId, err }, '[Ingestor] Could not link EFTA evidence');
      }
    }

    return added;
  }

  /**
   * Parse timeline entries.  Supported format:
   *   - **YYYY-MM-DD**: Title - Description
   *   - **Month YYYY**: Title
   *
   * Wipes existing events for idempotent re-sync.
   */
  private static async syncTimeline(investigationId: number, content: string): Promise<number> {
    // Clear and re-insert so repeated imports don't create duplicates
    await getApiPool().query(
      `DELETE FROM investigation_timeline_events WHERE investigation_id = $1`,
      [investigationId],
    );

    const pattern = /^[-*]\s+\*\*([^*]+)\*\*:\s*(.+)$/gm;
    let match: RegExpExecArray | null;
    let added = 0;

    while ((match = pattern.exec(content)) !== null) {
      const dateStr = match[1].trim();
      const rest = match[2].trim();
      const splitAt = rest.indexOf(' — ') !== -1 ? rest.indexOf(' — ') : rest.indexOf(' - ');
      const eventTitle = splitAt > -1 ? rest.substring(0, splitAt).trim() : rest.substring(0, 80);
      const eventDesc = splitAt > -1 ? rest.substring(splitAt + 3).trim() : rest;

      try {
        await investigationsRepository.addTimelineEvent(investigationId, {
          title: eventTitle,
          description: eventDesc,
          startDate: dateStr,
          type: 'event',
        });
        added++;
      } catch (err) {
        logger.warn({ dateStr, eventTitle, err }, '[Ingestor] Could not add timeline event');
      }
    }

    return added;
  }

  /**
   * Parse hypothesis blocks.  Format:
   *   > [!IMPORTANT]
   *   > **Hypothesis Title**: content
   */
  private static async syncHypotheses(investigationId: number, content: string): Promise<number> {
    const pattern =
      /^>\s+\[!(?:IMPORTANT|CAUTION)\]\s*\n>\s+\*\*([^*]+)\*\*[:\s]+(.+?)(?=\n[^>]|\n\n|$)/gms;
    let match: RegExpExecArray | null;
    let added = 0;

    while ((match = pattern.exec(content)) !== null) {
      const hypTitle = match[1].trim();
      const hypDesc = match[2].replace(/^>\s*/gm, '').trim();

      try {
        await investigationsRepository.addHypothesis(investigationId, {
          title: hypTitle,
          description: hypDesc,
        });
        added++;
      } catch (err) {
        logger.warn({ hypTitle, err }, '[Ingestor] Could not add hypothesis');
      }
    }

    return added;
  }

  /**
   * Parse leads from NOTE callouts.  Format:
   *   > [!NOTE]
   *   > **Lead #N (Title)**: description
   */
  private static async syncLeads(
    investigationId: number,
    content: string,
    createdBy: string,
  ): Promise<number> {
    const pattern = /^>\s+\[!NOTE\]\s*\n>\s+\*\*([^*]+)\*\*[:\s]+(.+?)(?=\n[^>]|\n\n|$)/gms;
    let match: RegExpExecArray | null;
    let added = 0;
    const pool = getApiPool();

    while ((match = pattern.exec(content)) !== null) {
      const rawTitle = match[1].trim();
      const desc = match[2].replace(/^>\s*/gm, '').trim();

      // Look for EFTA ref in the description
      const eftaMatch = desc.match(/EFTA\d{8}/);
      const eftaRef = eftaMatch ? eftaMatch[0] : null;

      let sourceDocId: number | null = null;
      if (eftaRef) {
        const doc = await pool.query(`SELECT id FROM documents WHERE file_path ILIKE $1 LIMIT 1`, [
          `%${eftaRef}%`,
        ]);
        if (doc.rows.length > 0) sourceDocId = Number(doc.rows[0].id);
      }

      // Check if a lead with this title already exists (avoid duplication on re-sync)
      const existing = await pool.query(
        `SELECT id FROM investigation_leads WHERE investigation_id = $1 AND title = $2 LIMIT 1`,
        [investigationId, rawTitle],
      );
      if (existing.rows.length > 0) continue;

      await pool.query(
        `INSERT INTO investigation_leads
          (investigation_id, title, description, status, priority,
           source_document_id, source_efta_ref, created_by)
         VALUES ($1, $2, $3, 'open', 'high', $4, $5, $6)`,
        [investigationId, rawTitle, desc, sourceDocId, eftaRef, createdBy],
      );
      added++;
    }

    return added;
  }
}
