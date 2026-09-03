import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { mediaStreamLimiter } from '../middleware/rateLimit.js';
import { findFirstExistingPath } from '../utils/pathResolver.js';

const DATA_ROOT = path.resolve(process.cwd(), 'data');

const router = Router();

const pdfQuerySchema = z.object({
  query: z.object({
    filePath: z.string().min(1),
    download: z.enum(['1', 'true']).optional(),
  }),
});

router.get('/pdf', mediaStreamLimiter, validate(pdfQuerySchema), async (req, res, next) => {
  try {
    const rawPath = req.query.filePath as string;
    const resolvedPath = findFirstExistingPath([rawPath]);
    if (!resolvedPath) return res.status(404).json({ error: 'PDF file not found on disk' });
    let canonical: string;
    try {
      canonical = fs.realpathSync(resolvedPath);
    } catch {
      return res.status(403).json({ error: 'Access denied' });
    }
    const dataRoot = path.resolve(DATA_ROOT);
    const normalizedRoot = dataRoot.endsWith(path.sep) ? dataRoot : `${dataRoot}${path.sep}`;
    if (canonical !== dataRoot && !canonical.startsWith(normalizedRoot)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.type('application/pdf');
    if (req.query.download) {
      const filename = path.basename(canonical).replace(/["\r\n]/g, '') || 'document.pdf';
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    return res.sendFile(canonical, { dotfiles: 'allow' });
  } catch (error) {
    next(error);
  }
});

export default router;
