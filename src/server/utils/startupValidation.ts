import fs from 'fs';
import { getApiPool } from '../db/connection.js';
import { logger } from '../services/Logger.js';

export async function validateStartup() {
  logger.info('[Startup] Validating environment and configuration...');
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Environment Variables
  const requiredEnv = ['NODE_ENV'];
  if (process.env.NODE_ENV === 'production') {
    requiredEnv.push('DATABASE_URL');
  }
  requiredEnv.forEach((env) => {
    if (!process.env[env]) {
      errors.push(`Missing required environment variable: ${env}`);
    }
  });
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.DATABASE_URL &&
    !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)
  ) {
    errors.push('DATABASE_URL must be a postgres:// or postgresql:// URI in production.');
  }
  const legacyDialectEnvKey = ['DB', 'DIALECT'].join('_');
  if (process.env[legacyDialectEnvKey]) {
    errors.push(
      `Legacy ${legacyDialectEnvKey} is set to ${process.env[legacyDialectEnvKey]}. Remove it; Postgres is the only supported runtime.`,
    );
  }

  // 2. Paths
  const corpusPath = process.env.RAW_CORPUS_BASE_PATH;
  if (!corpusPath) {
    warnings.push(
      'RAW_CORPUS_BASE_PATH is not set. Using default hardcoded path (Risk of failure).',
    );
  } else if (corpusPath && !fs.existsSync(corpusPath)) {
    warnings.push(`RAW_CORPUS_BASE_PATH is set to ${corpusPath} but directory does not exist.`);
  }

  if (process.env.NODE_ENV === 'production' && process.env.DB_PATH) {
    warnings.push(
      `DB_PATH is set to ${process.env.DB_PATH} in production, but the application now uses Postgres. This value is ignored.`,
    );
  }

  // 3. Auth
  // Authentication is now forced to be enabled in all environments
  // The ENABLE_AUTH environment variable is no longer used

  // 4. Schema Integrity
  try {
    const pool = getApiPool();
    const { rows: existingTablesRaw } = await pool.query(
      "SELECT tablename as name FROM pg_catalog.pg_tables WHERE schemaname = 'public'",
    );
    const existingTables = existingTablesRaw.map((r: { name: string }) => r.name);

    // Check critical tables
    if (!existingTables.includes('entities')) errors.push('Missing critical table: entities');
    if (!existingTables.includes('documents')) errors.push('Missing critical table: documents');

    const strictSchema =
      process.env.STRICT_SCHEMA === '1' ||
      process.env.STRICT_SCHEMA === 'true' ||
      process.env.NODE_ENV === 'production';
    if (strictSchema) {
      const requiredTables = [
        'entity_mentions',
        'investigations',
        'document_pages',
        'redaction_spans',
        'claim_triples',
        'document_sentences',
      ];
      for (const table of requiredTables) {
        if (!existingTables.includes(table)) {
          errors.push(`Missing required Postgres table for strict mode: ${table}`);
        }
      }

      const requiredColumns = [
        ['documents', 'original_file_id'],
        ['documents', 'has_failed_redactions'],
        ['documents', 'failed_redaction_count'],
        ['entity_mentions', 'doc_red_flag_rating'],
        ['entity_mentions', 'doc_date_created'],
        ['investigations', 'collaborator_ids'],
      ] as const;
      for (const [table, column] of requiredColumns) {
        const { rows: colRows } = await pool.query(
          `SELECT 1
           FROM information_schema.columns
           WHERE table_schema='public'
             AND table_name = $1
             AND column_name = $2
           LIMIT 1`,
          [table, column],
        );
        if (colRows.length === 0) {
          errors.push(`Missing required Postgres column for strict mode: ${table}.${column}`);
        }
      }
    }

    // Check for migrations table
    if (!existingTables.includes('pgmigrations')) {
      warnings.push('pgmigrations table missing. Migrations may not have run.');
    }
  } catch (e: unknown) {
    errors.push(`Database connection failed during validation: ${(e as Error).message}`);
  }

  // Report
  if (warnings.length > 0) {
    logger.warn('--- Startup Warnings ---');
    warnings.forEach((w) => logger.warn(`[WARN] ${w}`));
    logger.warn('------------------------');
  }

  if (errors.length > 0) {
    logger.error('--- Startup Errors ---');
    errors.forEach((e) => logger.error(`[ERR] ${e}`));
    logger.error('----------------------');
    throw new Error('Startup validation failed. See errors above.');
  }

  logger.info('[Startup] Validation passed.');
}
