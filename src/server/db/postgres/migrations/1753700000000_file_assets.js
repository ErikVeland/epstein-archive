/* eslint-disable no-undef */

/**
 * Migration: Add file_assets, document_assets, and media_assets tables
 *
 * These tables are referenced by AssetService in src/server/services/assetService.ts
 * and called from the ingest pipeline, but were never formally migrated.
 * Without them every document fails with "relation file_assets does not exist".
 */
export const shorthands = undefined;

export async function up(pgm) {
  // Deduplicated file registry — one row per unique file (keyed by SHA-256)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS file_assets (
      id                    BIGSERIAL PRIMARY KEY,
      asset_uuid            UUID        NOT NULL DEFAULT gen_random_uuid(),
      original_asset_id     BIGINT      REFERENCES file_assets(id) ON DELETE SET NULL,
      storage_path          TEXT        NOT NULL,
      file_name             TEXT,
      mime_type             TEXT,
      file_type             TEXT,
      file_size             BIGINT,
      sha256                TEXT,
      source_collection     TEXT,
      is_original           INTEGER     NOT NULL DEFAULT 1,
      is_derivative         INTEGER     NOT NULL DEFAULT 0,
      derivative_kind       TEXT,
      derivative_params_json TEXT,
      phash                 TEXT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_file_assets_sha256
      ON file_assets (sha256) WHERE sha256 IS NOT NULL;
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_file_assets_storage_path
      ON file_assets (storage_path);
  `);

  // document ↔ asset (M:N)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS document_assets (
      document_id  BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      asset_id     BIGINT NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE,
      role         TEXT   NOT NULL DEFAULT 'primary',
      PRIMARY KEY (document_id, asset_id)
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_assets_asset_id ON document_assets (asset_id);
  `);

  // media_item ↔ asset (M:N)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS media_assets (
      media_id   BIGINT NOT NULL,
      asset_id   BIGINT NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE,
      role       TEXT   NOT NULL DEFAULT 'primary',
      PRIMARY KEY (media_id, asset_id)
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_media_assets_asset_id ON media_assets (asset_id);
  `);

  // documents.unredacted_span_json — referenced in ingest_pipeline UPDATE but never migrated
  pgm.sql(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS unredacted_span_json TEXT;
  `);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE documents DROP COLUMN IF EXISTS unredacted_span_json;`);
  pgm.sql(`DROP TABLE IF EXISTS media_assets;`);
  pgm.sql(`DROP TABLE IF EXISTS document_assets;`);
  pgm.sql(`DROP TABLE IF EXISTS file_assets;`);
}
