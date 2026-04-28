import { z } from 'zod';

export const emailMailboxSchema = z.object({
  mailboxId: z.string(),
  entityId: z.number().nullable(),
  displayName: z.string(),
  totalThreads: z.number(),
  totalMessages: z.number(),
  lastActivityAt: z.string().nullable(),
  riskSummary: z.enum(['minimal', 'low', 'medium', 'high']).nullable(),
  isJunkSuppressed: z.boolean(),
  isVip: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export const emailMailboxesResponseSchema = z.object({
  revisionKey: z.string(),
  data: z.array(emailMailboxSchema),
});

export const emailThreadListItemSchema = z.object({
  threadId: z.string(),
  subject: z.string(),
  participants: z.array(z.string()),
  participantCount: z.number(),
  lastMessageAt: z.string(),
  snippet: z.string(),
  messageCount: z.number(),
  hasAttachments: z.boolean(),
  linkedEntityIds: z.array(z.number()),
  risk: z.number().nullable(),
  ladder: z.string().nullable(),
  confidence: z.number().nullable(),
});

export const emailThreadsResponseSchema = z.object({
  data: z.array(emailThreadListItemSchema),
  meta: z.object({
    total: z.number(),
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const emailThreadDetailsResponseSchema = z.object({
  threadId: z.string(),
  subject: z.string(),
  messages: z.array(
    z.object({
      messageId: z.string(),
      threadId: z.string(),
      subject: z.string(),
      from: z.string(),
      to: z.array(z.string()),
      cc: z.array(z.string()),
      date: z.string(),
      snippet: z.string(),
      flags: z.object({ hasAttachments: z.boolean() }),
      attachmentsMeta: z.array(
        z.object({
          filename: z.string().optional(),
          mimeType: z.string().optional(),
          size: z.number().optional(),
          linkedDocumentId: z.union([z.string(), z.number()]).optional(),
        }),
      ),
      linkedEntities: z.array(
        z.object({
          entityId: z.number(),
          name: z.string(),
          role: z.string().nullable(),
        }),
      ),
      ingestRunId: z.number().nullable(),
      pipelineVersion: z.string().nullable(),
      confidence: z.number().nullable(),
      ladder: z.string().nullable(),
      wasAgentic: z.boolean(),
      redFlagRating: z.number().nullable(),
    }),
  ),
});
