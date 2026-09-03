import { blackBookQueries } from '@epstein/db';
import { createHash } from 'node:crypto';
import { blackBookSourcePages } from '../../shared/blackBookSourcePages.js';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';
import { createBlackBookIdentityMatcher, type BlackBookIdentity } from './blackBookIdentity.js';

let identityCache: { expiresAt: number; identities: BlackBookIdentity[] } | null = null;

async function getIdentityIndex(): Promise<BlackBookIdentity[]> {
  if (identityCache && identityCache.expiresAt > Date.now()) return identityCache.identities;
  const rows = await blackBookQueries.getBlackBookIdentityIndex.run(undefined, getApiPool());
  const identities = rows.map((row) => ({
    id: Number(row.id),
    fullName: row.fullName,
    isVip: row.isVip === 1,
    thumbnailPath: row.thumbnailPath,
  }));
  identityCache = { expiresAt: Date.now() + 300_000, identities };
  return identities;
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
    const category = filters?.category || 'original';
    const original = category === 'original';
    const [rows, identities] = await Promise.all([
      blackBookQueries.getBlackBookSourceEntries.run(
        {
          category,
          search: original ? null : filters?.search || null,
          hasPhone: filters?.hasPhone === true,
          hasEmail: filters?.hasEmail === true,
          hasAddress: filters?.hasAddress === true,
          limit: original ? 10000 : Math.min(filters?.limit || 1000, 5000),
        },
        getApiPool(),
      ),
      getIdentityIndex(),
    ]);
    const search = filters?.search?.trim().toLowerCase();
    const matchIdentity = createBlackBookIdentityMatcher(identities);
    const entries = rows
      .map((row) => {
        const sourceName = String(row.entryText || '')
          .split('\n')[0]
          .trim();
        const match = original
          ? matchIdentity(sourceName)
          : { status: 'unresolved' as const, identity: null };
        return {
          ...row,
          id: Number(row.id),
          personId: match.identity?.id ?? null,
          documentId: row.documentId ? Number(row.documentId) : null,
          pageNumber: original
            ? (blackBookSourcePages[
                createHash('sha256')
                  .update(row.entryText || '')
                  .digest('hex')
              ] ?? row.pageNumber)
            : row.pageNumber,
          sourceName,
          displayName: match.status === 'name_match' ? match.identity!.fullName : sourceName,
          candidateName: match.identity?.fullName ?? null,
          matchStatus: match.status,
          isVip: match.identity?.isVip ?? false,
          thumbnailPath:
            match.status === 'name_match' ? (match.identity?.thumbnailPath ?? null) : null,
        };
      })
      .filter((entry) => {
        if (
          filters?.letter &&
          filters.letter !== 'ALL' &&
          !entry.sourceName.toUpperCase().startsWith(filters.letter.toUpperCase())
        )
          return false;
        return (
          !search ||
          [entry.entryText, entry.displayName, entry.candidateName].some((value) =>
            value?.toLowerCase().includes(search),
          )
        );
      });
    entries.sort(
      (a, b) =>
        Number(b.isVip) - Number(a.isVip) ||
        Number(b.matchStatus === 'name_match') - Number(a.matchStatus === 'name_match') ||
        a.displayName.localeCompare(b.displayName) ||
        a.id - b.id,
    );
    return entries.slice(0, filters?.limit || 1000);
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
      logger.error(
        { err: error },
        '[BlackBook] getBlackBookReviewStats failed — re-throwing so callers surface a 500',
      );
      throw error;
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
          { id: personId, fullName: correctedName },
          getApiPool(),
        );

        await getApiPool().query(
          'INSERT INTO audit_log (action, target_type, target_id, ent_id, actor_id, payload_json) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            'black_book_review',
            'person',
            personId.toString(),
            Number(personId),
            'system',
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
          'INSERT INTO audit_log (action, target_type, target_id, ent_id, actor_id, payload_json) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            'black_book_review',
            'person',
            personId.toString(),
            Number(personId),
            'system',
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
