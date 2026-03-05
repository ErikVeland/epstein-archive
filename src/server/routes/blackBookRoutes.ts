import { Router } from 'express';
import { blackBookRepository } from '../db/blackBookRepository.js';
import { authenticateRequest } from '../auth/middleware.js';

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

router.get('/', async (req, res, next) => {
  try {
    const letter = String((req.query as any).letter || 'ALL').trim();
    const search = String((req.query as any).search || '').trim() || undefined;
    const hasPhone = String((req.query as any).hasPhone || '').toLowerCase() === 'true';
    const hasEmail = String((req.query as any).hasEmail || '').toLowerCase() === 'true';
    const hasAddress = String((req.query as any).hasAddress || '').toLowerCase() === 'true';
    const category = String((req.query as any).category || '').trim() as
      | 'original'
      | 'contact'
      | 'credential'
      | '';
    const limit = Math.min(10000, Math.max(1, Number((req.query as any).limit || 1000)));

    const rows = await blackBookRepository.getBlackBookEntries({
      letter,
      search,
      hasPhone,
      hasEmail,
      hasAddress,
      category: category || undefined,
      limit,
    });

    const data = rows.map((entry: any) => ({
      id: Number(entry.id),
      person_id: entry.personId ? Number(entry.personId) : null,
      entry_text: String(entry.entryText || ''),
      phone_numbers: parseJsonArray(entry.phoneNumbers),
      addresses: parseJsonArray(entry.addresses),
      email_addresses: parseJsonArray(entry.emailAddresses),
      notes: String(entry.notes || ''),
      page_number: entry.pageNumber ?? null,
      document_id: entry.documentId ? Number(entry.documentId) : null,
      entry_category: entry.entryCategory || 'original',
      person_name: entry.displayName || null,
      thumbnail_path: entry.thumbnailPath || null,
    }));

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

router.post('/review/:id', authenticateRequest, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid entry id' });
    const correctedName = String((req.body as any)?.correctedName || '').trim();
    const action = String((req.body as any)?.action || '').trim() as 'approve' | 'skip' | 'delete';
    if (!['approve', 'skip', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    await blackBookRepository.updateBlackBookReview(id, correctedName, action);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
