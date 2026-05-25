import { Router, Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../auth/middleware.js';
import { authenticateRequest } from '../auth/middleware.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { investigationsRepository } from '../db/investigationsRepository.js';
import { InvestigationRow, InvestigationEvidenceRow } from '../db/rowTypes.js';
import { InvestigationIngestorService } from '../services/InvestigationIngestorService.js';
import { buildManifest, buildEvidenceCsv, buildBundleReadme } from '../utils/exportManifest.js';
import { buildExportFileInventory } from '../utils/investigationExportInventory.js';

const router = Router();

const DATA_ROOT = path.resolve(process.cwd(), 'data');
const SCHEMA_HASH = process.env.SCHEMA_HASH || process.env.PG_SCHEMA_HASH || 'unknown';
const ZIP_FILE_LIMIT = 100;
const ZIP_SIZE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB

// Read app version once at startup from package.json
const APP_VERSION: string = (() => {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
})();

// Schemas
const numericIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
});

async function buildExportPreview(investigation: InvestigationRow, investigationId: number) {
  const evidence = await investigationsRepository.getEvidence(investigationId, {
    limit: ZIP_FILE_LIMIT,
  });
  const evidenceList = Array.isArray(evidence)
    ? evidence
    : (evidence as { data?: unknown[] }).data || [];

  const { includedFiles, skippedFiles } = await buildExportFileInventory({
    evidenceList: evidenceList as Record<string, unknown>[],
    dataRoot: DATA_ROOT,
    fileCountCap: ZIP_FILE_LIMIT,
    sizeLimitBytes: ZIP_SIZE_LIMIT_BYTES,
  });

  let timelineEvents: unknown[] = [];
  try {
    timelineEvents = await investigationsRepository.getTimelineEvents(investigationId);
  } catch {
    timelineEvents = [];
  }

  let allAnnotations: unknown[] = [];
  try {
    allAnnotations = await investigationsRepository.getAllEvidenceAnnotations(investigationId);
  } catch {
    allAnnotations = [];
  }

  const evidenceIds = Array.from(
    new Set(
      (evidenceList as unknown as InvestigationEvidenceRow[])
        .map((e) => Number(e.id ?? e.investigation_evidence_id ?? 0))
        .filter((n) => n > 0),
    ),
  ).sort((a, b) => a - b);

  const warnings = [
    ...skippedFiles.map((file) => ({
      code: file.reason,
      message: `Evidence #${file.evidenceId} source file will be skipped: ${file.reason.replace(/_/g, ' ')}`,
      action: 'Review the evidence source path before exporting if this file is required.',
    })),
    ...(evidenceIds.length === 0
      ? [
          {
            code: 'no_evidence',
            message: 'This packet has no evidence items.',
            action: 'Add evidence before exporting a review-grade packet.',
          },
        ]
      : []),
  ];

  const readiness =
    evidenceIds.length === 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready';

  // Build preview-friendly response
  const included = includedFiles
    .filter((f): f is typeof f & { zipPath: string } => !!f.zipPath)
    .map((f) => ({
      name: f.zipPath,
      type: f.zipPath.endsWith('.pdf')
        ? 'document'
        : f.zipPath.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
          ? 'image'
          : f.zipPath.match(/\.(mp4|avi|mov|mkv|webm)$/i)
            ? 'video'
            : f.zipPath.match(/\.(mp3|wav|ogg|m4a)$/i)
              ? 'audio'
              : 'file',
      size: f.sizeBytes,
    }));

  const omitted = warnings.map((w) => ({
    name: w.message,
    reason: w.code,
  }));

  const manifest = buildManifest({
    investigationId,
    title: investigation.title,
    status: investigation.status,
    appVersion: APP_VERSION,
    schemaHash: SCHEMA_HASH,
    exportLimits: {
      fileCountCap: ZIP_FILE_LIMIT,
      sizeLimitBytes: ZIP_SIZE_LIMIT_BYTES,
    },
    evidenceIds,
    includedFiles,
    skippedFiles,
  });

  return {
    readiness: readiness === 'ready',
    included,
    omitted,
    skippedFiles: skippedFiles.map((f) => f.reason),
    warnings: warnings.map((w) => w.message),
    summary: {
      evidenceCount: evidenceIds.length,
      includedFileCount: includedFiles.length,
      skippedFileCount: skippedFiles.length,
      timelineEventCount: timelineEvents.length,
      annotationCount: allAnnotations.length,
    },
    manifest,
  };
}

router.get(
  '/:id/export/preview',
  authenticateRequest,
  validate(numericIdParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const numericId = Number(id);
      const investigation = await investigationsRepository.getInvestigationById(numericId);

      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      res.json(await buildExportPreview(investigation as InvestigationRow, numericId));
    } catch (error) {
      next(error);
    }
  },
);

// Export Case Bundle as ZIP
router.get(
  '/:id/export/zip',
  authenticateRequest,
  validate(numericIdParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const numericId = Number(id);
      const investigation = await investigationsRepository.getInvestigationById(numericId);

      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      const evidence = await investigationsRepository.getEvidence(numericId, {
        limit: ZIP_FILE_LIMIT,
      });

      const evidenceList = Array.isArray(evidence)
        ? evidence
        : (evidence as { data?: unknown[] }).data || [];

      // --- Build file inventory (included + skipped) before opening the archive ---
      type EvidenceRow = Record<string, unknown>;
      const { includedFiles, skippedFiles, filesToAdd } = await buildExportFileInventory({
        evidenceList: evidenceList as EvidenceRow[],
        dataRoot: DATA_ROOT,
        fileCountCap: ZIP_FILE_LIMIT,
        sizeLimitBytes: ZIP_SIZE_LIMIT_BYTES,
      });

      // --- Fetch timeline events and all evidence annotations ---
      let timelineEvents: unknown[] = [];
      try {
        timelineEvents = await investigationsRepository.getTimelineEvents(numericId);
      } catch {
        timelineEvents = [];
      }

      let allAnnotations: unknown[] = [];
      try {
        allAnnotations = await investigationsRepository.getAllEvidenceAnnotations(numericId);
      } catch {
        allAnnotations = [];
      }

      // --- Build manifest (includes checksum over sorted inventory) ---
      const evidenceIds = Array.from(
        new Set(
          (evidenceList as unknown as InvestigationEvidenceRow[])
            .map((e) => Number(e.id ?? e.investigation_evidence_id ?? 0))
            .filter((n) => n > 0),
        ),
      ).sort((a, b) => a - b);

      const manifest = buildManifest({
        investigationId: numericId,
        title: investigation.title,
        status: investigation.status,
        appVersion: APP_VERSION,
        schemaHash: SCHEMA_HASH,
        exportLimits: {
          fileCountCap: ZIP_FILE_LIMIT,
          sizeLimitBytes: ZIP_SIZE_LIMIT_BYTES,
        },
        evidenceIds,
        includedFiles,
        skippedFiles,
      });

      // --- Build evidence CSV ---
      const evidenceCsv = buildEvidenceCsv(evidenceList as unknown as InvestigationEvidenceRow[]);

      // --- Stream archive ---
      const archive = archiver('zip', { zlib: { level: 6 } });

      let headersSent = false;
      archive.on('error', (err) => {
        if (!headersSent) {
          next(err);
        } else {
          // Headers already sent — destroy socket to signal broken download
          res.destroy(err);
        }
      });

      res.setHeader('x-export-file-limit', String(ZIP_FILE_LIMIT));
      res.setHeader('x-export-size-limit', String(ZIP_SIZE_LIMIT_BYTES));
      res.setHeader('x-export-skipped-files', String(skippedFiles.length));

      res.attachment(`investigation-bundle-${numericId}.zip`);
      headersSent = true;
      archive.pipe(res);

      archive.append(
        buildBundleReadme({
          appVersion: APP_VERSION,
          schemaHash: SCHEMA_HASH,
          generatedAt: manifest.generatedAt,
        }),
        { name: 'README.md' },
      );
      archive.append(JSON.stringify(investigation, null, 2), { name: 'investigation.json' });
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
      archive.append(JSON.stringify(evidenceList, null, 2), { name: 'evidence.json' });
      archive.append(evidenceCsv, { name: 'evidence.csv' });
      archive.append(JSON.stringify(timelineEvents, null, 2), { name: 'timeline.json' });
      if (allAnnotations.length > 0) {
        archive.append(JSON.stringify(allAnnotations, null, 2), { name: 'annotations.json' });
      }

      for (const { absolutePath, zipPath } of filesToAdd) {
        archive.file(absolutePath, { name: zipPath });
      }

      await archive.finalize();
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/investigations/import-report
 * Parses a Markdown investigation report and syncs it into the database.
 * Requires auth (admin or owner).
 */
router.post(
  '/import-report',
  authenticateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const body = req.body as { markdown?: string; ownerId?: string };
      if (!body.markdown || typeof body.markdown !== 'string') {
        return res.status(400).json({ error: 'Missing required field: markdown (string)' });
      }
      if (body.markdown.length > 500_000) {
        return res.status(413).json({ error: 'Report too large (max 500 KB)' });
      }

      const ownerId = body.ownerId || authReq.user?.id || 'user-1';
      const result = await InvestigationIngestorService.ingestFromMarkdown(body.markdown, ownerId);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
