/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // Both tables are empty and no longer referenced by application code.
  // media_items and file_assets remain canonical; evidence/entity links are derived
  // from investigation_evidence.document_id + entity_mentions.
  pgm.sql(`DROP TABLE IF EXISTS public.media_assets;`);
  pgm.sql(`DROP TABLE IF EXISTS public.evidence_entity;`);
}

export async function down(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.evidence_entity (
      evidence_id bigint REFERENCES public.evidence(id) ON DELETE CASCADE,
      entity_id bigint REFERENCES public.entities(id) ON DELETE CASCADE,
      role text,
      confidence real DEFAULT 0.5,
      mention_context text,
      PRIMARY KEY (evidence_id, entity_id)
    );
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS evidence_entity_entity_id_index
    ON public.evidence_entity (entity_id);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.media_assets (
      media_id bigint,
      asset_id bigint REFERENCES public.file_assets(id) ON DELETE CASCADE,
      role text,
      PRIMARY KEY (media_id, asset_id)
    );
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_media_assets_asset_id
    ON public.media_assets (asset_id);
  `);
}
