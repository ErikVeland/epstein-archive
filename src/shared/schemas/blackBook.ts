import { z } from 'zod';

export const blackBookEntrySchema = z.object({
  id: z.number(),
  person_id: z.number().nullable(),
  entry_text: z.string(),
  phone_numbers: z.array(z.string()),
  addresses: z.array(z.string()),
  email_addresses: z.array(z.string()),
  notes: z.string().optional(),
  page_number: z.number().nullable(),
  document_id: z.number().nullable(),
  entry_category: z.string().optional(),
  person_name: z.string().nullable(),
  thumbnail_path: z.string().nullable(),
  source_name: z.string(),
  candidate_name: z.string().nullable(),
  match_status: z.enum(['name_match', 'possible_match', 'ambiguous', 'unresolved']),
  is_vip: z.boolean(),
});

// Schema for GET /api/black-book
export const blackBookListResponseSchema = z.object({
  data: z.array(blackBookEntrySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
