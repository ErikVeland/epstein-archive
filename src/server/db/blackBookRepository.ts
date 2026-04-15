import { blackBookQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

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

function parseArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value !== 'string' || value.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
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
        hasPhone: filters?.hasPhone ?? null,
        limit: filters?.limit ? String(filters.limit) : '100',
      },
      getApiPool(),
    );

    const filteredEntries = entries.filter((e: Record<string, unknown>) => {
      const emails = parseArrayValue(e.emailAddresses);
      const addresses = parseArrayValue(e.addresses);

      if (filters?.hasEmail && (!Array.isArray(emails) || emails.length === 0)) return false;
      if (filters?.hasAddress && (!Array.isArray(addresses) || addresses.length === 0))
        return false;
      if (filters?.category && String(e.entryCategory || '').toLowerCase() !== filters.category)
        return false;
      return true;
    });

    // Enrich with profile pictures
    const names = filteredEntries
      .map((e: { displayName?: string | null }) => e.displayName)
      .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0);

    const thumbnailsByPersonId = new Map<number, string>();
    const thumbnailsByName = new Map<string, string>();
    const dedupedPersonIds = Array.from(
      new Set(
        filteredEntries
          .map((e: Record<string, unknown>) => {
            const id = Number(e.personId);
            return Number.isFinite(id) && id > 0 ? id : null;
          })
          .filter((id): id is number => id != null),
      ),
    ).slice(0, 2000);
    const dedupedNames = Array.from(new Set(names)).slice(0, 2000);

    if (dedupedPersonIds.length > 0) {
      try {
        const thumbRes = await getApiPool().query(
          `
          SELECT
            entity_ids.entity_id,
            COALESCE(representative_face.crop_path, tagged_face.crop_path) AS thumbnail_path
          FROM UNNEST($1::bigint[]) AS entity_ids(entity_id)
          LEFT JOIN LATERAL (
            SELECT f.crop_path
            FROM face_clusters fc
            JOIN faces f ON f.id = fc.representative_face_id
            WHERE fc.entity_id = entity_ids.entity_id
              AND fc.is_hidden = false
              AND f.crop_path IS NOT NULL
            LIMIT 1
          ) representative_face ON TRUE
          LEFT JOIN LATERAL (
            SELECT f.crop_path
            FROM media_item_people mip
            JOIN faces f ON f.media_item_id::text = mip.media_item_id::text
            LEFT JOIN face_clusters fc ON fc.id = f.cluster_id
            WHERE mip.entity_id = entity_ids.entity_id
              AND f.crop_path IS NOT NULL
              AND (fc.is_hidden = false OR fc.is_hidden IS NULL)
            ORDER BY
              CASE WHEN fc.entity_id = entity_ids.entity_id THEN 0 ELSE 1 END,
              f.detection_confidence DESC NULLS LAST,
              f.id
            LIMIT 1
          ) tagged_face ON TRUE
          `,
          [dedupedPersonIds],
        );

        for (const row of thumbRes.rows) {
          if (typeof row.thumbnail_path === 'string' && row.thumbnail_path.length > 0) {
            thumbnailsByPersonId.set(Number(row.entity_id), row.thumbnail_path);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn({ message }, '[BlackBook] Entity thumbnail enrichment skipped');
      }
    }

    if (dedupedNames.length > 0) {
      try {
        const thumbRes = await getApiPool().query(
          `
          SELECT fc.name, f.crop_path
          FROM face_clusters fc
          JOIN faces f ON f.id = fc.representative_face_id
          WHERE fc.name = ANY($1::text[]) AND fc.is_hidden = false
          `,
          [dedupedNames],
        );
        for (const row of thumbRes.rows) {
          thumbnailsByName.set(row.name, row.crop_path);
        }
      } catch (error) {
        // Face thumbnail enrichment is optional; never fail the Black Book response on this step.
        const message = error instanceof Error ? error.message : String(error);
        logger.warn({ message }, '[BlackBook] Thumbnail enrichment skipped');
      }
    }

    return correctEntries(
      filteredEntries.map((e: Record<string, unknown>) => ({
        ...e,
        id: Number(e.id),
        personId: e.personId ? Number(e.personId) : null,
        documentId: e.documentId ? Number(e.documentId) : null,
        thumbnailPath:
          (typeof e.personId === 'number' ? thumbnailsByPersonId.get(e.personId) : undefined) ??
          (typeof e.displayName === 'string' ? thumbnailsByName.get(e.displayName) : undefined),
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
      logger.error({ err: error }, 'Error fetching review stats');
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
      logger.error({ err: error }, 'Error updating review');
      throw error;
    }
  },
};
