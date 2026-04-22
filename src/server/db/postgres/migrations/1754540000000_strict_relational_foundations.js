/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // 1. Forensic Signals (Strict Relational Version)
  // Instead of arrays, we use junction tables for entities and evidence.
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS forensic_signals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      signal_type text NOT NULL,
      confidence real NOT NULL DEFAULT 0.5,
      risk_score real NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'pending_review',
      metadata_json jsonb DEFAULT '{}',
      created_at timestamp DEFAULT current_timestamp,
      updated_at timestamp DEFAULT current_timestamp
    );
  `);

  pgm.sql(
    'CREATE INDEX IF NOT EXISTS forensic_signals_signal_type_index ON forensic_signals (signal_type);',
  );
  pgm.sql('CREATE INDEX IF NOT EXISTS forensic_signals_status_index ON forensic_signals (status);');

  // Junction for entities involved in a signal
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS forensic_signal_entities (
      signal_id uuid REFERENCES forensic_signals(id) ON DELETE CASCADE,
      entity_id bigint REFERENCES entities(id) ON DELETE CASCADE,
      role text
    );
  `);
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pk_forensic_signal_entities'
      ) THEN
        ALTER TABLE forensic_signal_entities
        ADD CONSTRAINT pk_forensic_signal_entities PRIMARY KEY (signal_id, entity_id);
      END IF;
    END $$;
  `);

  // Junction for evidence supporting a signal
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS forensic_signal_evidence (
      signal_id uuid REFERENCES forensic_signals(id) ON DELETE CASCADE,
      document_id bigint REFERENCES documents(id) ON DELETE CASCADE,
      snippet text
    );
  `);
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pk_forensic_signal_evidence'
      ) THEN
        ALTER TABLE forensic_signal_evidence
        ADD CONSTRAINT pk_forensic_signal_evidence PRIMARY KEY (signal_id, document_id);
      END IF;
    END $$;
  `);

  // 2. Investigation Collaborators (Normalizing from JSON/CSV strings)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS investigation_collaborators (
      investigation_id bigint REFERENCES investigations(id) ON DELETE CASCADE,
      user_id text REFERENCES users(id) ON DELETE CASCADE,
      permission_level text DEFAULT 'editor',
      joined_at timestamp DEFAULT current_timestamp
    );
  `);
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pk_investigation_collaborators'
      ) THEN
        ALTER TABLE investigation_collaborators
        ADD CONSTRAINT pk_investigation_collaborators PRIMARY KEY (investigation_id, user_id);
      END IF;
    END $$;
  `);

  // 3. Investigation & Hypothesis Tags (Standard Junction)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS investigation_tags (
      id bigserial PRIMARY KEY,
      tag_name text UNIQUE NOT NULL
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS investigation_tag_links (
      investigation_id bigint REFERENCES investigations(id) ON DELETE CASCADE,
      tag_id bigint REFERENCES investigation_tags(id) ON DELETE CASCADE
    );
  `);
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pk_investigation_tag_links'
      ) THEN
        ALTER TABLE investigation_tag_links
        ADD CONSTRAINT pk_investigation_tag_links PRIMARY KEY (investigation_id, tag_id);
      END IF;
    END $$;
  `);

  // 4. Activity & Audit Normalization
  // We add specialized link columns to investigation_activity and audit_log for common targets
  // while keeping target_id/type for legacy/fallback.
  pgm.sql(
    'ALTER TABLE investigation_activity ADD COLUMN IF NOT EXISTS doc_id bigint REFERENCES documents(id) ON DELETE SET NULL;',
  );
  pgm.sql(
    'ALTER TABLE investigation_activity ADD COLUMN IF NOT EXISTS ent_id bigint REFERENCES entities(id) ON DELETE SET NULL;',
  );
  pgm.sql(
    'ALTER TABLE investigation_activity ADD COLUMN IF NOT EXISTS lead_id bigint REFERENCES investigation_leads(id) ON DELETE SET NULL;',
  );

  pgm.sql(
    'ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS doc_id bigint REFERENCES documents(id) ON DELETE SET NULL;',
  );
  pgm.sql(
    'ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ent_id bigint REFERENCES entities(id) ON DELETE SET NULL;',
  );

  pgm.sql(
    'ALTER TABLE quality_flags ADD COLUMN IF NOT EXISTS doc_id bigint REFERENCES documents(id) ON DELETE CASCADE;',
  );
  pgm.sql(
    'ALTER TABLE quality_flags ADD COLUMN IF NOT EXISTS ent_id bigint REFERENCES entities(id) ON DELETE CASCADE;',
  );

  pgm.sql(
    'CREATE INDEX IF NOT EXISTS investigation_activity_doc_id_index ON investigation_activity (doc_id);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS investigation_activity_ent_id_index ON investigation_activity (ent_id);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS investigation_activity_lead_id_index ON investigation_activity (lead_id);',
  );
  pgm.sql('CREATE INDEX IF NOT EXISTS audit_log_doc_id_index ON audit_log (doc_id);');
  pgm.sql('CREATE INDEX IF NOT EXISTS audit_log_ent_id_index ON audit_log (ent_id);');
  pgm.sql('CREATE INDEX IF NOT EXISTS quality_flags_doc_id_index ON quality_flags (doc_id);');
  pgm.sql('CREATE INDEX IF NOT EXISTS quality_flags_ent_id_index ON quality_flags (ent_id);');
}

export async function down(pgm) {
  pgm.dropColumn('quality_flags', ['doc_id', 'ent_id']);
  pgm.dropColumn('audit_log', ['doc_id', 'ent_id']);
  pgm.dropColumn('investigation_activity', ['doc_id', 'ent_id', 'lead_id']);
  pgm.dropTable('investigation_tag_links');
  pgm.dropTable('investigation_tags');
  pgm.dropTable('investigation_collaborators');
  pgm.dropTable('forensic_signal_evidence');
  pgm.dropTable('forensic_signal_entities');
  pgm.dropTable('forensic_signals');
}
