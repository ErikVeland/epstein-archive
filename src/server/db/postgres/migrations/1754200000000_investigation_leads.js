/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS investigation_leads (
      id bigserial PRIMARY KEY,
      investigation_id bigint NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'open',
      priority text NOT NULL DEFAULT 'medium',
      source_document_id bigint REFERENCES documents(id) ON DELETE SET NULL,
      source_efta_ref text,
      assigned_to text,
      created_by text,
      resolved_at timestamp,
      resolution_notes text,
      created_at timestamp NOT NULL DEFAULT current_timestamp,
      updated_at timestamp NOT NULL DEFAULT current_timestamp
    );
  `);

  pgm.sql(
    'CREATE INDEX IF NOT EXISTS investigation_leads_investigation_id_index ON investigation_leads (investigation_id);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS investigation_leads_status_index ON investigation_leads (status);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS investigation_leads_source_document_id_index ON investigation_leads (source_document_id);',
  );
}

export async function down(pgm) {
  pgm.dropTable('investigation_leads');
}
