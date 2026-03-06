/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS investigation_evidence_annotations (
      id BIGSERIAL PRIMARY KEY,
      investigation_id BIGINT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
      evidence_id BIGINT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
      annotation_type TEXT NOT NULL,
      content TEXT NOT NULL,
      color TEXT,
      start_offset INTEGER,
      end_offset INTEGER,
      created_by TEXT,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT iea_annotation_type_check
        CHECK (annotation_type IN ('highlight', 'note', 'tag', 'classification')),
      CONSTRAINT iea_offsets_check
        CHECK (
          (start_offset IS NULL AND end_offset IS NULL)
          OR (start_offset IS NOT NULL AND end_offset IS NOT NULL AND end_offset > start_offset)
        )
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_iea_investigation_evidence_created
      ON investigation_evidence_annotations (investigation_id, evidence_id, created_at DESC);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP INDEX IF EXISTS idx_iea_investigation_evidence_created;`);
  pgm.sql(`DROP TABLE IF EXISTS investigation_evidence_annotations;`);
}
