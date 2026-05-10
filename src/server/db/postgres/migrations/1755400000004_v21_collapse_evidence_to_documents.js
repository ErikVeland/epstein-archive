/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE SCHEMA IF NOT EXISTS archive_v21;

    CREATE TABLE IF NOT EXISTS archive_v21.evidence_legacy AS
      SELECT * FROM public.evidence;
    CREATE TABLE IF NOT EXISTS archive_v21.investigation_evidence_legacy AS
      SELECT * FROM public.investigation_evidence;
    CREATE TABLE IF NOT EXISTS archive_v21.hypothesis_evidence_legacy AS
      SELECT * FROM public.hypothesis_evidence;
    CREATE TABLE IF NOT EXISTS archive_v21.chain_of_custody_legacy AS
      SELECT * FROM public.chain_of_custody;
    CREATE TABLE IF NOT EXISTS archive_v21.investigation_evidence_annotations_legacy AS
      SELECT * FROM public.investigation_evidence_annotations;

    UPDATE public.documents d
    SET
      title = COALESCE(d.title, e.title),
      content_preview = COALESCE(d.content_preview, e.description, LEFT(e.extracted_text, 320)),
      content = COALESCE(d.content, e.extracted_text),
      evidence_type = COALESCE(d.evidence_type, e.evidence_type),
      red_flag_rating = COALESCE(d.red_flag_rating, e.red_flag_rating),
      metadata_json = COALESCE(d.metadata_json, '{}'::jsonb)
        || jsonb_build_object(
          'v21_legacy_evidence_id', e.id,
          'v21_legacy_evidence_tags', e.evidence_tags,
          'v21_legacy_original_filename', e.original_filename,
          'v21_legacy_evidence_metadata', COALESCE(e.metadata_json, '{}'::jsonb)
        )
    FROM public.investigation_evidence ie
    JOIN public.evidence e ON e.id = ie.evidence_id
    WHERE d.id = ie.document_id;

    ALTER TABLE public.hypothesis_evidence
      ADD COLUMN IF NOT EXISTS document_id bigint;

    UPDATE public.hypothesis_evidence he
    SET document_id = ie.document_id
    FROM public.hypotheses h
    JOIN public.investigation_evidence ie
      ON ie.investigation_id = h.investigation_id
    WHERE h.id = he.hypothesis_id
      AND ie.evidence_id = he.evidence_id
      AND he.document_id IS NULL;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM public.hypothesis_evidence
        WHERE document_id IS NULL
      ) THEN
        RAISE EXCEPTION 'v21 evidence collapse blocked: hypothesis_evidence rows could not be mapped to documents';
      END IF;
    END $$;

    ALTER TABLE public.hypothesis_evidence
      ALTER COLUMN document_id SET NOT NULL;

    DO $$
    DECLARE
      constraint_name text;
    BEGIN
      FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.hypothesis_evidence'::regclass
          AND confrelid = 'public.evidence'::regclass
      LOOP
        EXECUTE format('ALTER TABLE public.hypothesis_evidence DROP CONSTRAINT %I', constraint_name);
      END LOOP;
    END $$;

    ALTER TABLE public.hypothesis_evidence
      DROP COLUMN IF EXISTS evidence_id;

    ALTER TABLE public.hypothesis_evidence
      ADD CONSTRAINT hypothesis_evidence_document_id_fkey
      FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

    DO $$
    DECLARE
      constraint_name text;
    BEGIN
      FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.investigation_evidence_annotations'::regclass
          AND confrelid = 'public.evidence'::regclass
      LOOP
        EXECUTE format('ALTER TABLE public.investigation_evidence_annotations DROP CONSTRAINT %I', constraint_name);
      END LOOP;
    END $$;

    ALTER TABLE public.investigation_evidence_annotations
      RENAME COLUMN evidence_id TO document_id;

    ALTER TABLE public.investigation_evidence_annotations
      ADD CONSTRAINT investigation_evidence_annotations_document_id_fkey
      FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

    DO $$
    DECLARE
      constraint_name text;
    BEGIN
      FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.chain_of_custody'::regclass
          AND confrelid = 'public.evidence'::regclass
      LOOP
        EXECUTE format('ALTER TABLE public.chain_of_custody DROP CONSTRAINT %I', constraint_name);
      END LOOP;
    END $$;

    ALTER TABLE public.chain_of_custody
      RENAME COLUMN evidence_id TO document_id;

    ALTER TABLE public.chain_of_custody
      ADD CONSTRAINT chain_of_custody_document_id_fkey
      FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

    DROP INDEX IF EXISTS public.idx_ie_investigation_evidence_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ie_investigation_document_unique
      ON public.investigation_evidence (investigation_id, document_id);

    DO $$
    DECLARE
      constraint_name text;
    BEGIN
      FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.investigation_evidence'::regclass
          AND confrelid = 'public.evidence'::regclass
      LOOP
        EXECUTE format('ALTER TABLE public.investigation_evidence DROP CONSTRAINT %I', constraint_name);
      END LOOP;
    END $$;

    ALTER TABLE public.investigation_evidence
      DROP COLUMN IF EXISTS evidence_id;

    DROP TABLE public.evidence;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.evidence AS
      SELECT * FROM archive_v21.evidence_legacy;

    ALTER TABLE public.evidence
      ADD PRIMARY KEY (id);

    ALTER TABLE public.investigation_evidence
      ADD COLUMN IF NOT EXISTS evidence_id bigint;

    UPDATE public.investigation_evidence ie
    SET evidence_id = legacy.evidence_id
    FROM archive_v21.investigation_evidence_legacy legacy
    WHERE legacy.id = ie.id;

    DROP INDEX IF EXISTS public.idx_ie_investigation_document_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ie_investigation_evidence_unique
      ON public.investigation_evidence (investigation_id, evidence_id);

    ALTER TABLE public.hypothesis_evidence
      ADD COLUMN IF NOT EXISTS evidence_id bigint;

    UPDATE public.hypothesis_evidence he
    SET evidence_id = legacy.evidence_id
    FROM archive_v21.hypothesis_evidence_legacy legacy
    WHERE legacy.id = he.id;

    ALTER TABLE public.hypothesis_evidence
      DROP COLUMN IF EXISTS document_id;

    ALTER TABLE public.investigation_evidence_annotations
      RENAME COLUMN document_id TO evidence_id;

    ALTER TABLE public.chain_of_custody
      RENAME COLUMN document_id TO evidence_id;
  `);
}
