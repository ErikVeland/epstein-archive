import { reviewQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { IGetMentionsQueueResult } from '@epstein/db/src/queries/__generated__/review.js';

export const reviewQueueRepository = {
  async getPendingItems(limit: number = 50) {
    const mentions = await reviewQueueRepository.getMentionsQueue(limit);
    const claims = await reviewQueueRepository.getClaimsQueue(limit);
    type MentionItem = (typeof mentions)[number];
    type ClaimItem = (typeof claims)[number];
    return [
      ...mentions.map((m: MentionItem) => ({
        id: m.id,
        type: 'mention',
        subject_id: m.entity_id,
        ingest_run_id: null,
        status: 'pending' as const,
        priority: 'medium' as const,
        payload_json: {
          before: null,
          after: m,
        },
        notes: null,
        created_at: new Date().toISOString(),
      })),
      ...claims.map((c: ClaimItem) => ({
        id: c.id,
        type: 'claim',
        subject_id: c.subject_entity_id,
        ingest_run_id: null,
        status: 'pending' as const,
        priority: 'medium' as const,
        payload_json: {
          before: null,
          after: c,
        },
        notes: null,
        created_at: new Date().toISOString(),
      })),
    ];
  },
  async getMentionsQueue(limit: number = 50) {
    const rows = await reviewQueries.getMentionsQueue.run({ limit }, getApiPool());
    return rows.map((r: IGetMentionsQueueResult) => ({
      id: r.id,
      entity_id: r.entityId,
      document_id: r.documentId,
      mention_context: r.mentionContext,
      confidence_score: r.confidenceScore,
      entity_name: r.entityName,
      file_name: r.fileName,
      signal_score: r.signalScore,
    }));
  },

  async verifyMention(id: number, verifiedBy: string = 'system') {
    await reviewQueries.verifyMention.run({ id: String(id), verifiedBy }, getApiPool());
    return { success: true };
  },

  async rejectMention(id: number, reason: string, verifiedBy: string = 'system') {
    await reviewQueries.rejectMention.run({ id: String(id), reason, verifiedBy }, getApiPool());
    return { success: true };
  },

  async getClaimsQueue(limit: number = 50) {
    const rows = await reviewQueries.getClaimsQueue.run({ limit }, getApiPool());
    return rows.map((r) => ({
      id: r.id,
      subject_entity_id: r.subjectEntityId,
      subject_entity_name: (r as unknown as Record<string, unknown>).subjectEntityName ?? null,
      predicate: r.predicate,
      object_text: r.objectText,
      confidence: r.confidence,
      signal_score: r.signalScore,
      file_name: r.fileName,
    }));
  },

  async verifyClaim(id: number, verifiedBy: string = 'system') {
    await reviewQueries.verifyClaim.run({ id, verifiedBy }, getApiPool());
    return { success: true };
  },

  async rejectClaim(id: number, reason: string, verifiedBy: string = 'system') {
    await reviewQueries.rejectClaim.run({ id, reason, verifiedBy }, getApiPool());
    return { success: true };
  },

  async updateDecision(
    id: string,
    status: 'reviewed' | 'rejected',
    userId: string,
    notes?: string,
  ) {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) return false;

    if (status === 'reviewed') {
      await reviewQueueRepository.verifyMention(numericId, userId);
    } else {
      await reviewQueueRepository.rejectMention(numericId, notes || '', userId);
    }

    return true;
  },
};
