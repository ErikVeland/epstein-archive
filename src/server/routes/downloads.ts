import express from 'express';
import fs from 'fs';
import { logAudit } from '../utils/auditLogger.js';
import { logger } from '../services/Logger.js';

const router = express.Router();

// Map of release IDs (from AboutPage) to file paths
// We can use the 'title' or a slug as the ID.
const FILE_MAP: Record<string, string> = {
  'black-book': "./data/originals/Jeffrey Epstein's Black Book.pdf",
  'flight-logs': './data/originals/EPSTEIN FLIGHT LOGS UNREDACTED.pdf',
};

router.get('/release/:id', async (req, res) => {
  const releaseId = req.params.id;

  try {
    // 1. Check static map
    if (FILE_MAP[releaseId]) {
      const filePath = FILE_MAP[releaseId];
      if (fs.existsSync(filePath)) {
        // [AUDIT] Log the download
        // We can't check 'is_quarantined' easily for these static files without a DB lookup if they aren't in the DB.
        // But for now, we assume these static static files are safe (Black Book, Flight Logs).
        // If we move to DB-backed releases, we should check.
        // Let's log it at least.
        const userId = (req as any).user?.id || 'anonymous';

        // Log the download event
        await logAudit(
          'download',
          userId,
          'document',
          releaseId,
          {
            status: 'success',
            static_release: true,
          },
          undefined,
          (req as any).requestId,
        );
        return res.download(filePath);
      }
    }

    // 2. If not in map, maybe it's a tag?
    // If user asks for "house-oversight", we can't zips 20k files easily.
    // Return 404 or Not Implemented for now.

    logger.warn(`Download requested for unknown release: ${releaseId}`);
    return res.status(404).json({ error: 'Download not available for this release' });
  } catch (err) {
    logger.error({ err: err }, 'Download error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
