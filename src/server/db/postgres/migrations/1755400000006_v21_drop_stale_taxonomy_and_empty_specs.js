/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE SCHEMA IF NOT EXISTS archive_v21;

    CREATE TABLE IF NOT EXISTS archive_v21.collections_legacy AS
      SELECT * FROM public.collections;
    CREATE TABLE IF NOT EXISTS archive_v21.document_collections_legacy AS
      SELECT * FROM public.document_collections;
    CREATE TABLE IF NOT EXISTS archive_v21.entity_merge_candidates_legacy AS
      SELECT * FROM public.entity_merge_candidates;
    CREATE TABLE IF NOT EXISTS archive_v21.evidence_types_legacy AS
      SELECT * FROM public.evidence_types;
    CREATE TABLE IF NOT EXISTS archive_v21.entity_evidence_types_legacy AS
      SELECT * FROM public.entity_evidence_types;

    DROP TABLE IF EXISTS public.document_collections;
    DROP TABLE IF EXISTS public.collections;
    DROP TABLE IF EXISTS public.entity_merge_candidates;
    DROP TABLE IF EXISTS public.entity_evidence_types;
    DROP TABLE IF EXISTS public.evidence_types;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.collections AS
      SELECT * FROM archive_v21.collections_legacy;
    ALTER TABLE public.collections
      ADD PRIMARY KEY (id);
    ALTER TABLE public.collections
      ADD CONSTRAINT collections_name_key UNIQUE (name);

    CREATE TABLE IF NOT EXISTS public.document_collections AS
      SELECT * FROM archive_v21.document_collections_legacy;
    ALTER TABLE public.document_collections
      ADD CONSTRAINT pk_document_collections PRIMARY KEY (document_id, collection_id);

    CREATE TABLE IF NOT EXISTS public.entity_merge_candidates AS
      SELECT * FROM archive_v21.entity_merge_candidates_legacy;
    ALTER TABLE public.entity_merge_candidates
      ADD PRIMARY KEY (id);

    CREATE TABLE IF NOT EXISTS public.evidence_types AS
      SELECT * FROM archive_v21.evidence_types_legacy;
    ALTER TABLE public.evidence_types
      ADD PRIMARY KEY (id);
    ALTER TABLE public.evidence_types
      ADD CONSTRAINT evidence_types_type_name_key UNIQUE (type_name);

    CREATE TABLE IF NOT EXISTS public.entity_evidence_types AS
      SELECT * FROM archive_v21.entity_evidence_types_legacy;
    ALTER TABLE public.entity_evidence_types
      ADD CONSTRAINT pk_entity_evidence_types PRIMARY KEY (entity_id, evidence_type_id);
  `);
}
