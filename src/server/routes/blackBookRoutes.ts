import { Router } from 'express';
import { blackBookRepository } from '../db/blackBookRepository.js';
import { authenticateRequest } from '../auth/middleware.js';
import { validate, blackBookQuerySchema, blackBookReviewSchema } from '../middleware/validate.js';

const router = Router();

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

router.get('/', validate(blackBookQuerySchema), async (req, res, next) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const letter = String(q.letter || 'ALL').trim();
    const search = String(q.search || '').trim() || undefined;
    const hasPhone = String(q.hasPhone || '').toLowerCase() === 'true';
    const hasEmail = String(q.hasEmail || '').toLowerCase() === 'true';
    const hasAddress = String(q.hasAddress || '').toLowerCase() === 'true';
    const rawCategory = String(q.category || '').trim();
    const category = (
      rawCategory === 'original' || rawCategory === 'contact' || rawCategory === 'credential'
        ? rawCategory
        : ''
    ) as 'original' | 'contact' | 'credential' | '';
    const limit = Math.min(10000, Math.max(1, Number(q.limit || 1000)));

    const rows = await blackBookRepository.getBlackBookEntries({
      letter,
      search,
      hasPhone,
      hasEmail,
      hasAddress,
      category: category || undefined,
      limit,
    });

    type BlackBookEntry = {
      id: number;
      personId: number | null;
      entryText: string | null;
      phoneNumbers: unknown;
      addresses: unknown;
      emailAddresses: unknown;
      notes: string | null;
      pageNumber: number | null;
      documentId: number | null;
      entryCategory: string | null;
      displayName: string | null;
      thumbnailPath: string | null | undefined;
    };
    const data = rows.map((entry) => {
      const blackBookEntry = entry as Partial<BlackBookEntry>;
      return {
        id: Number(blackBookEntry.id || 0),
        person_id: blackBookEntry.personId ? Number(blackBookEntry.personId) : null,
        entry_text: String(blackBookEntry.entryText || ''),
        phone_numbers: parseJsonArray(blackBookEntry.phoneNumbers),
        addresses: parseJsonArray(blackBookEntry.addresses),
        email_addresses: parseJsonArray(blackBookEntry.emailAddresses),
        notes: String(blackBookEntry.notes || ''),
        page_number: blackBookEntry.pageNumber ?? null,
        document_id: blackBookEntry.documentId ? Number(blackBookEntry.documentId) : null,
        entry_category: blackBookEntry.entryCategory || 'original',
        person_name: blackBookEntry.displayName || null,
        thumbnail_path: blackBookEntry.thumbnailPath || null,
      };
    });

    res.json({
      data,
      total: data.length,
      page: 1,
      pageSize: data.length,
      totalPages: 1,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/review', async (_req, res, next) => {
  try {
    const [entries, stats] = await Promise.all([
      blackBookRepository.getBlackBookReviewEntries(),
      blackBookRepository.getBlackBookReviewStats(),
    ]);
    res.json({ entries, stats });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/review/:id',
  authenticateRequest,
  validate(blackBookReviewSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = req.body as { correctedName: string; action: 'approve' | 'skip' | 'delete' };
      await blackBookRepository.updateBlackBookReview(id, body.correctedName.trim(), body.action);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
