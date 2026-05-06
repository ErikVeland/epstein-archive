import { z } from 'zod';

export const mentionQueueItemSchema = z.object({
  id: z.number(),
  entity_name: z.string(),
  document_id: z.union([z.number(), z.string()]).transform(Number),
  file_name: z.string(),
  mention_context: z.string().nullable(),
  confidence_score: z.number().nullable(),
  signal_score: z.number().nullable(),
});

export const claimQueueItemSchema = z.object({
  id: z.number(),
  subject_entity_id: z.union([z.number(), z.string()]).nullable(),
  subject_entity_name: z.string().nullable(),
  predicate: z.string().nullable(),
  object_text: z.string().nullable(),
  confidence: z.number().nullable(),
  signal_score: z.number().nullable(),
  file_name: z.string().nullable(),
});

export const mentionsQueueResponseSchema = z.array(mentionQueueItemSchema);
export const claimsQueueResponseSchema = z.array(claimQueueItemSchema);

export type MentionQueueItem = z.infer<typeof mentionQueueItemSchema>;
export type ClaimQueueItem = z.infer<typeof claimQueueItemSchema>;
export type MentionsQueueResponse = z.infer<typeof mentionsQueueResponseSchema>;
export type ClaimsQueueResponse = z.infer<typeof claimsQueueResponseSchema>;
