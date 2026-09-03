import type { z } from 'zod';
import type { analyticsPersonSchema, analyticsPeerSchema } from '../contracts/analyticsPeople';
export type AnalyticsPerson = z.infer<typeof analyticsPersonSchema>;
export type AnalyticsPeer = z.infer<typeof analyticsPeerSchema>;
