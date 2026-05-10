/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE SCHEMA IF NOT EXISTS archive_v21;

    CREATE TABLE IF NOT EXISTS archive_v21.relations_legacy AS
      SELECT * FROM public.relations;
    CREATE TABLE IF NOT EXISTS archive_v21.relation_evidence_legacy AS
      SELECT * FROM public.relation_evidence;
    CREATE TABLE IF NOT EXISTS archive_v21.entities_legacy_type AS
      SELECT id, full_name, entity_type, type
      FROM public.entities
      WHERE type IS NOT NULL;

    ALTER TABLE public.relation_evidence
      ADD COLUMN IF NOT EXISTS source_entity_id bigint,
      ADD COLUMN IF NOT EXISTS target_entity_id bigint,
      ADD COLUMN IF NOT EXISTS relationship_type text;

    UPDATE public.relation_evidence re
    SET
      source_entity_id = r.subject_entity_id,
      target_entity_id = r.object_entity_id,
      relationship_type = r.predicate
    FROM public.relations r
    WHERE r.id = re.relation_id
      AND re.source_entity_id IS NULL;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM public.relation_evidence
        WHERE source_entity_id IS NULL
           OR target_entity_id IS NULL
           OR relationship_type IS NULL
      ) THEN
        RAISE EXCEPTION 'v21 relation collapse blocked: relation_evidence rows could not be mapped to entity_relationships';
      END IF;
    END $$;

    INSERT INTO public.entity_relationships (
      source_entity_id,
      target_entity_id,
      relationship_type,
      strength,
      confidence,
      first_seen_at,
      last_seen_at,
      was_agentic
    )
    SELECT
      r.subject_entity_id,
      r.object_entity_id,
      COALESCE(r.predicate, 'related_to'),
      LEAST(GREATEST(COALESCE(r.weight, 0), 0), 1),
      LEAST(GREATEST(COALESCE(r.weight, 0), 0), 1),
      r.first_seen_at,
      r.last_seen_at,
      1
    FROM public.relations r
    ON CONFLICT (source_entity_id, target_entity_id, relationship_type) DO UPDATE
      SET strength = GREATEST(entity_relationships.strength, EXCLUDED.strength),
          confidence = GREATEST(entity_relationships.confidence, EXCLUDED.confidence),
          first_seen_at = LEAST(entity_relationships.first_seen_at, EXCLUDED.first_seen_at),
          last_seen_at = GREATEST(entity_relationships.last_seen_at, EXCLUDED.last_seen_at);

    ALTER TABLE public.relation_evidence
      ALTER COLUMN source_entity_id SET NOT NULL,
      ALTER COLUMN target_entity_id SET NOT NULL,
      ALTER COLUMN relationship_type SET NOT NULL;

    ALTER TABLE public.relation_evidence
      ADD CONSTRAINT relation_evidence_entity_relationship_fkey
      FOREIGN KEY (source_entity_id, target_entity_id, relationship_type)
      REFERENCES public.entity_relationships(source_entity_id, target_entity_id, relationship_type)
      ON DELETE CASCADE;

    ALTER TABLE public.relation_evidence
      DROP COLUMN IF EXISTS relation_id;

    DROP TABLE public.relations;

    DROP INDEX IF EXISTS public.entities_full_name_type_unique_idx;
    DROP INDEX IF EXISTS public.entities_type_index;
    ALTER TABLE public.entities
      DROP COLUMN IF EXISTS type;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE public.entities
      ADD COLUMN IF NOT EXISTS type text;

    UPDATE public.entities e
    SET type = legacy.type
    FROM archive_v21.entities_legacy_type legacy
    WHERE legacy.id = e.id;

    CREATE INDEX IF NOT EXISTS entities_type_index ON public.entities(type);
    CREATE UNIQUE INDEX IF NOT EXISTS entities_full_name_type_unique_idx
      ON public.entities(full_name, type);

    CREATE TABLE IF NOT EXISTS public.relations AS
      SELECT * FROM archive_v21.relations_legacy;

    ALTER TABLE public.relations
      ADD PRIMARY KEY (id);

    ALTER TABLE public.relation_evidence
      ADD COLUMN IF NOT EXISTS relation_id text;

    UPDATE public.relation_evidence re
    SET relation_id = legacy.relation_id
    FROM archive_v21.relation_evidence_legacy legacy
    WHERE legacy.id = re.id;

    ALTER TABLE public.relation_evidence
      DROP CONSTRAINT IF EXISTS relation_evidence_entity_relationship_fkey,
      DROP COLUMN IF EXISTS source_entity_id,
      DROP COLUMN IF EXISTS target_entity_id,
      DROP COLUMN IF EXISTS relationship_type;
  `);
}
