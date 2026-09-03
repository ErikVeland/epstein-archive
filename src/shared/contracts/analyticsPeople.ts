import { z } from 'zod';

export const analyticsPersonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isVip: z.boolean(),
  reviewed: z.boolean(),
  storedMentions: z.number().nonnegative().nullable(),
  documentCount: z.number().nonnegative(),
  relationshipCount: z.number().nonnegative(),
});
export const analyticsPeopleSchema = z.array(analyticsPersonSchema);
export const analyticsPeerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isVip: z.boolean(),
  relationshipCount: z.number().nonnegative(),
  types: z.string().nullable(),
});
export const analyticsPeersSchema = z.array(analyticsPeerSchema);
