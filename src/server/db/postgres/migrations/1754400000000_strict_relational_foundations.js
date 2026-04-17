/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // 1. Forensic Signals (Strict Relational Version)
  // Instead of arrays, we use junction tables for entities and evidence.
  pgm.createTable('forensic_signals', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    signal_type: { type: 'text', notNull: true }, // e.g., 'CO_TRAVEL', 'CO_PRESENCE'
    confidence: { type: 'real', notNull: true, default: 0.5 },
    risk_score: { type: 'real', notNull: true, default: 0 },
    status: { type: 'text', notNull: true, default: "'pending_review'" },
    metadata_json: { type: 'jsonb', default: '{}' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('forensic_signals', 'signal_type');
  pgm.createIndex('forensic_signals', 'status');

  // Junction for entities involved in a signal
  pgm.createTable('forensic_signal_entities', {
    signal_id: { type: 'uuid', references: 'forensic_signals(id)', onDelete: 'CASCADE' },
    entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    role: { type: 'text' }, // e.g., 'primary', 'secondary'
  });
  pgm.addConstraint('forensic_signal_entities', 'pk_forensic_signal_entities', {
    primaryKey: ['signal_id', 'entity_id'],
  });

  // Junction for evidence supporting a signal
  pgm.createTable('forensic_signal_evidence', {
    signal_id: { type: 'uuid', references: 'forensic_signals(id)', onDelete: 'CASCADE' },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    snippet: { type: 'text' },
  });
  pgm.addConstraint('forensic_signal_evidence', 'pk_forensic_signal_evidence', {
    primaryKey: ['signal_id', 'document_id'],
  });

  // 2. Investigation Collaborators (Normalizing from JSON/CSV strings)
  pgm.createTable('investigation_collaborators', {
    investigation_id: { type: 'bigint', references: 'investigations(id)', onDelete: 'CASCADE' },
    user_id: { type: 'text', references: 'users(id)', onDelete: 'CASCADE' },
    permission_level: { type: 'text', default: "'editor'" },
    joined_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('investigation_collaborators', 'pk_investigation_collaborators', {
    primaryKey: ['investigation_id', 'user_id'],
  });

  // 3. Investigation & Hypothesis Tags (Standard Junction)
  pgm.createTable('investigation_tags', {
    id: { type: 'bigserial', primaryKey: true },
    tag_name: { type: 'text', unique: true, notNull: true },
  });

  pgm.createTable('investigation_tag_links', {
    investigation_id: { type: 'bigint', references: 'investigations(id)', onDelete: 'CASCADE' },
    tag_id: { type: 'bigint', references: 'investigation_tags(id)', onDelete: 'CASCADE' },
  });
  pgm.addConstraint('investigation_tag_links', 'pk_investigation_tag_links', {
    primaryKey: ['investigation_id', 'tag_id'],
  });

  // 4. Activity & Audit Normalization
  // We add specialized link columns to investigation_activity and audit_log for common targets
  // while keeping target_id/type for legacy/fallback.
  pgm.addColumns('investigation_activity', {
    doc_id: { type: 'bigint', references: 'documents(id)', onDelete: 'SET NULL' },
    ent_id: { type: 'bigint', references: 'entities(id)', onDelete: 'SET NULL' },
    lead_id: { type: 'bigint', references: 'investigation_leads(id)', onDelete: 'SET NULL' },
  });

  pgm.addColumns('audit_log', {
    doc_id: { type: 'bigint', references: 'documents(id)', onDelete: 'SET NULL' },
    ent_id: { type: 'bigint', references: 'entities(id)', onDelete: 'SET NULL' },
  });

  pgm.addColumns('quality_flags', {
    doc_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    ent_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
  });

  pgm.createIndex('investigation_activity', 'doc_id');
  pgm.createIndex('investigation_activity', 'ent_id');
  pgm.createIndex('investigation_activity', 'lead_id');
  pgm.createIndex('audit_log', 'doc_id');
  pgm.createIndex('audit_log', 'ent_id');
  pgm.createIndex('quality_flags', 'doc_id');
  pgm.createIndex('quality_flags', 'ent_id');
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
