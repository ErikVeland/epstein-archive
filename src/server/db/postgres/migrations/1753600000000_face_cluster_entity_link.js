/* eslint-disable no-undef */

/**
 * Migration: Link face clusters to canonical entities
 *
 * Adds entity_id FK to face_clusters so named people surface in
 * the PhotoBrowser "People" filter via media_item_people.
 */
export const shorthands = undefined;

export async function up(pgm) {
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
}
