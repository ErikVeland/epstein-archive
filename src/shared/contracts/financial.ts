import { z } from 'zod';
export const financialRecordSchema = z.object({
  id: z.string().min(1),
  fromEntityId: z.number().nullable(),
  toEntityId: z.number().nullable(),
  fromEntityName: z.string().nullable(),
  toEntityName: z.string().nullable(),
  amount: z.number().finite(),
  currency: z.string(),
  date: z.string(),
  description: z.string().nullable(),
  transactionType: z.string().nullable(),
  riskRating: z.number().nullable(),
  sourceDocumentId: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
});
export const financialRecordsSchema = z.array(financialRecordSchema);
