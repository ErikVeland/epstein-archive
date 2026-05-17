/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    DO $$
    DECLARE
      col_type TEXT;
    BEGIN
      SELECT data_type INTO col_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'document_annotations'
        AND column_name = 'document_id';

      IF col_type = 'integer' THEN
        ALTER TABLE public.document_annotations
          DROP CONSTRAINT IF EXISTS document_annotations_document_id_fkey;
        ALTER TABLE public.document_annotations
          ALTER COLUMN document_id TYPE BIGINT USING document_id::bigint;
        ALTER TABLE public.document_annotations
          ADD CONSTRAINT document_annotations_document_id_fkey
            FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.document_annotations
      ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'public',
      ADD COLUMN IF NOT EXISTS review_state TEXT NOT NULL DEFAULT 'approved',
      ADD COLUMN IF NOT EXISTS created_by_user_id TEXT,
      ADD COLUMN IF NOT EXISTS created_by_role TEXT;
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.document_annotations
      DROP CONSTRAINT IF EXISTS document_annotations_scope_check;
  `);
  pgm.sql(`
    ALTER TABLE IF EXISTS public.document_annotations
      ADD CONSTRAINT document_annotations_scope_check
        CHECK (scope IN ('public', 'forensic'));
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.document_annotations
      DROP CONSTRAINT IF EXISTS document_annotations_review_state_check;
  `);
  pgm.sql(`
    ALTER TABLE IF EXISTS public.document_annotations
      ADD CONSTRAINT document_annotations_review_state_check
        CHECK (review_state IN ('draft', 'approved', 'rejected'));
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_annotations_doc_scope_state
      ON public.document_annotations (document_id, scope, review_state, created_at DESC);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.annotation_events (
      id                 BIGSERIAL PRIMARY KEY,
      annotation_id      BIGINT NOT NULL REFERENCES public.document_annotations(id) ON DELETE CASCADE,
      document_id        BIGINT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
      event_type         TEXT NOT NULL,
      actor_user_id      TEXT,
      actor_role         TEXT,
      actor_fingerprint_hash TEXT,
      request_id         TEXT,
      payload_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
      prev_event_hash    TEXT,
      event_hash         TEXT NOT NULL,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_annotation_events_annotation
      ON public.annotation_events (annotation_id, created_at DESC);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_annotation_events_document
      ON public.annotation_events (document_id, created_at DESC);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS public.annotation_events;`);
  pgm.sql(`DROP INDEX IF EXISTS public.idx_document_annotations_doc_scope_state;`);
  pgm.sql(
    `ALTER TABLE IF EXISTS public.document_annotations DROP COLUMN IF EXISTS created_by_role;`,
  );
  pgm.sql(
    `ALTER TABLE IF EXISTS public.document_annotations DROP COLUMN IF EXISTS created_by_user_id;`,
  );
  pgm.sql(`ALTER TABLE IF EXISTS public.document_annotations DROP COLUMN IF EXISTS review_state;`);
  pgm.sql(`ALTER TABLE IF EXISTS public.document_annotations DROP COLUMN IF EXISTS scope;`);
}
