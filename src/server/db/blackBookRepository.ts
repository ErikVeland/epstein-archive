import { blackBookQueries } from '@epstein/db';
import { getApiPool } from './connection.js';

// Common OCR errors in the Black Book and their corrections
// Format: [error, correction]
const OCR_CORRECTIONS: [string, string][] = [
  // Trump entries
  ['Trump, Donaic', 'Trump, Donald'],
  ['he Trump Organization', 'The Trump Organization'],
  ['Milania', 'Melania'],
  ['Truit Mas ne.', 'Trump Mansion'],
  ['Tomores Pa biasor Assoc.', 'Trump Plaza Business Assoc.'],
  // Common OCR pattern errors
  ['(и', '(h)'],
  ['(w)', '(w)'],
  ['(hf)', '(hf)'],
  ['฿', '(f)'], // Thai Baht symbol often misread
  // Name corrections
  ['AcDonald', 'McDonald'],
  ['Thoistrup', 'Tholstrup'],
];

/**
 * Apply OCR corrections to entry text
 */
function applyOcrCorrections(text: string): string {
  let corrected = text;
  for (const [error, correction] of OCR_CORRECTIONS) {
    corrected = corrected.replace(new RegExp(escapeRegExp(error), 'g'), correction);
  }
  return corrected;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply corrections to all entries in a result set
 */
function correctEntries<T extends { entryText?: string | null; displayName?: string | null }>(
  entries: T[],
): T[] {
  return entries.map((entry) => ({
    ...entry,
    entryText: entry.entryText ? applyOcrCorrections(entry.entryText) : entry.entryText,
    displayName: entry.displayName ? applyOcrCorrections(entry.displayName) : entry.displayName,
  }));
}

export const blackBookRepository = {
  getBlackBookEntries: async (filters?: {
    letter?: string;
    search?: string;
    hasPhone?: boolean;
    hasEmail?: boolean;
    hasAddress?: boolean;
    category?: 'original' | 'contact' | 'credential';
    limit?: number;
  }) => {
    const entries = await blackBookQueries.getBlackBookEntries.run(
      {
        letter: filters?.letter === 'ALL' ? null : filters?.letter || null,
        search: filters?.search || null,
        hasPhone: filters?.hasPhone || null,
        limit: filters?.limit ? String(filters.limit) : '100',
      },
      getApiPool(),
    );

    // Enrich with profile pictures
    const names = entries
      .map((e: { displayName?: string | null }) => e.displayName)
      .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0);

    const thumbnailsByName = new Map<string, string>();
    if (names.length > 0) {
      const thumbRes = await getApiPool().query(
        `
        SELECT fc.name, f.crop_path
        FROM face_clusters fc
        JOIN faces f ON f.id = fc.representative_face_id
        WHERE fc.name = ANY($1::text[]) AND fc.is_hidden = false
        `,
        [names],
      );
      for (const row of thumbRes.rows) {
        thumbnailsByName.set(row.name, row.crop_path);
      }
    }

    return correctEntries(
      entries.map((e: any) => ({
        ...e,
        id: Number(e.id),
        personId: e.personId ? Number(e.personId) : null,
        documentId: e.documentId ? Number(e.documentId) : null,
        thumbnailPath: e.displayName ? thumbnailsByName.get(e.displayName) : undefined,
      })),
    );
  },

  getBlackBookReviewEntries: async () => {
    // Currently no-op until specialized review view is established in Postgres
    return [];
  },

  getBlackBookReviewStats: async () => {
    try {
      const stats = await blackBookQueries.getBlackBookReviewStats.run(undefined, getApiPool());
      const res = stats[0];
      return {
        total: Number(res?.total || 0),
        remaining: Number(res?.remaining || 0),
        reviewed: Number(res?.reviewed || 0),
      };
    } catch (error) {
      console.error('Error fetching review stats:', error);
      return { total: 0, remaining: 0, reviewed: 0 };
    }
  },

  updateBlackBookReview: async (
    entryId: number,
    correctedName: string,
    action: 'approve' | 'skip' | 'delete',
  ) => {
    try {
      const rows = await getApiPool().query(
        'SELECT person_id FROM black_book_entries WHERE id = $1',
        [entryId],
      );
      const personId = rows.rows[0]?.person_id;

      if (!personId) {
        throw new Error('Entry not found');
      }

      if (action === 'approve') {
        await blackBookQueries.updateBlackBookReview.run(
          { id: BigInt(personId), fullName: correctedName },
          getApiPool(),
        );

        await getApiPool().query(
          'INSERT INTO audit_log (operation, entity_type, entity_id, details_json) VALUES ($1, $2, $3, $4)',
          [
            'black_book_review',
            'person',
            personId.toString(),
            JSON.stringify({ action: 'approve', correctedName }),
          ],
        );
      } else if (action === 'skip') {
        await getApiPool().query('UPDATE entities SET manually_reviewed = 1 WHERE id = $1', [
          personId,
        ]);
      } else if (action === 'delete') {
        await getApiPool().query(
          "UPDATE entities SET needs_review = 0, manually_reviewed = 1, full_name = '[DELETED]' WHERE id = $1",
          [personId],
        );

        await getApiPool().query(
          'INSERT INTO audit_log (operation, entity_type, entity_id, details_json) VALUES ($1, $2, $3, $4)',
          [
            'black_book_review',
            'person',
            personId.toString(),
            JSON.stringify({ action: 'delete' }),
          ],
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  },
};
