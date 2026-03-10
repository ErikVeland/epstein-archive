/* eslint-disable no-undef */

/**
 * Migration: Face detection tables + entity linking
 *
 * 1. Creates faces and face_clusters tables (IF NOT EXISTS — safe on dev where
 *    these may already exist from an earlier schema).
 * 2. Adds entity_id FK to face_clusters so named people surface in the
 *    PhotoBrowser "People" filter via media_item_people.
 */
export const shorthands = undefined;

export async function up(pgm) {
  // ── Base tables ────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS face_clusters (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name                  TEXT NOT NULL DEFAULT 'Unknown',
      is_hidden             BOOLEAN NOT NULL DEFAULT false,
      representative_face_id UUID,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS faces (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      media_item_id        BIGINT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
      cluster_id           UUID REFERENCES face_clusters(id) ON DELETE SET NULL,
      embedding            TEXT,
      bounding_box         JSONB,
      detection_confidence FLOAT NOT NULL DEFAULT 0,
      crop_path            TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_faces_media_item_id ON faces(media_item_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_faces_cluster_id ON faces(cluster_id);`);

  // FK from face_clusters back to faces — use DO $$ block to skip if exists
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_face_clusters_representative'
          AND table_name = 'face_clusters'
      ) THEN
        ALTER TABLE face_clusters
          ADD CONSTRAINT fk_face_clusters_representative
          FOREIGN KEY (representative_face_id) REFERENCES faces(id) ON DELETE SET NULL
          NOT VALID;
      END IF;
    END $$;
  `);

  // ── Entity linking ─────────────────────────────────────────────────────────
  pgm.sql(`
    ALTER TABLE face_clusters
      ADD COLUMN IF NOT EXISTS entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL;
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_face_clusters_entity_id ON face_clusters(entity_id);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP INDEX IF EXISTS idx_face_clusters_entity_id;`);
  pgm.sql(`ALTER TABLE face_clusters DROP COLUMN IF EXISTS entity_id;`);
  pgm.sql(`DROP TABLE IF EXISTS faces;`);
  pgm.sql(`DROP TABLE IF EXISTS face_clusters;`);
}
