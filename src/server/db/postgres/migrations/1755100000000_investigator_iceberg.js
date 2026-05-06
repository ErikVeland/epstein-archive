/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS danger_motif_findings (
      id bigserial PRIMARY KEY,
      investigation_id bigint REFERENCES investigations(id) ON DELETE CASCADE,
      lead_id bigint REFERENCES investigation_leads(id) ON DELETE SET NULL,
      motif_type text NOT NULL,
      harm_type text NOT NULL DEFAULT 'unknown',
      title text NOT NULL,
      description text,
      source_summary text NOT NULL DEFAULT '',
      confidence double precision,
      risk_score double precision,
      evidence_count integer NOT NULL DEFAULT 0,
      path_length integer,
      contradiction_count integer NOT NULL DEFAULT 0,
      review_state text NOT NULL DEFAULT 'unreviewed',
      status text NOT NULL DEFAULT 'open',
      priority text NOT NULL DEFAULT 'medium',
      primary_entity_ids bigint[] NOT NULL DEFAULT '{}',
      explainability_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      generated_by text NOT NULL DEFAULT 'danger_motif_service',
      generated_at timestamp NOT NULL DEFAULT current_timestamp,
      created_at timestamp NOT NULL DEFAULT current_timestamp,
      updated_at timestamp NOT NULL DEFAULT current_timestamp
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS danger_motif_evidence (
      id bigserial PRIMARY KEY,
      finding_id bigint NOT NULL REFERENCES danger_motif_findings(id) ON DELETE CASCADE,
      document_id bigint REFERENCES documents(id) ON DELETE SET NULL,
      source_type text,
      snippet text,
      confidence double precision,
      metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT current_timestamp
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS evidence_chain_items (
      id bigserial PRIMARY KEY,
      investigation_id bigint NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
      lead_id text,
      item_type text NOT NULL,
      title text NOT NULL,
      payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by text,
      created_at timestamp NOT NULL DEFAULT current_timestamp
    );
  `);

  pgm.sql(
    'CREATE INDEX IF NOT EXISTS danger_motif_findings_investigation_idx ON danger_motif_findings (investigation_id, risk_score DESC, confidence DESC);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS danger_motif_findings_motif_idx ON danger_motif_findings (motif_type);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS danger_motif_findings_harm_idx ON danger_motif_findings (harm_type);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS danger_motif_findings_review_idx ON danger_motif_findings (review_state);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS danger_motif_findings_entities_gin_idx ON danger_motif_findings USING gin (primary_entity_ids);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS danger_motif_evidence_finding_idx ON danger_motif_evidence (finding_id);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS danger_motif_evidence_document_idx ON danger_motif_evidence (document_id);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS evidence_chain_items_investigation_idx ON evidence_chain_items (investigation_id, created_at DESC);',
  );
}

export async function down(pgm) {
  pgm.dropTable('evidence_chain_items', { ifExists: true });
  pgm.dropTable('danger_motif_evidence', { ifExists: true });
  pgm.dropTable('danger_motif_findings', { ifExists: true });
}
