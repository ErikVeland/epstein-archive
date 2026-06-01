import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://'), {
      message: 'DATABASE_URL must be a PostgreSQL connection string',
    }),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_POOL_MAX: z.coerce.number().int().positive().default(18),
  INGEST_POOL_MAX: z.coerce.number().int().positive().default(8),
  MAINTENANCE_POOL_MAX: z.coerce.number().int().positive().default(2),
  CONNECT_TIMEOUT: z.coerce.number().int().positive().default(5000),
});

export type Env = z.infer<typeof envSchema>;

export function readEnvStrict(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error(
      '❌ Invalid environment variables for @epstein/db:\n' + z.prettifyError(result.error),
    );
    throw new Error('Invalid environment configuration');
  }

  const env = result.data;

  return env;
}
