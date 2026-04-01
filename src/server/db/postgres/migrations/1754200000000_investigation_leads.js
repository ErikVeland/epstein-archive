/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.createTable('investigation_leads', {
    id: { type: 'bigserial', primaryKey: true },
    investigation_id: {
      type: 'bigint',
      notNull: true,
      references: 'investigations(id)',
      onDelete: 'CASCADE',
    },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    status: {
      type: 'text',
      notNull: true,
      default: "'open'",
      // Values: 'open', 'pursued', 'dead_end', 'resolved'
    },
    priority: {
      type: 'text',
      notNull: true,
      default: "'medium'",
      // Values: 'low', 'medium', 'high', 'critical'
    },
    source_document_id: {
      type: 'bigint',
      references: 'documents(id)',
      onDelete: 'SET NULL',
    },
    source_efta_ref: { type: 'text' }, // e.g. "EFTA00741277" for display / cross-ref
    assigned_to: { type: 'text' },
    created_by: { type: 'text' },
    resolved_at: { type: 'timestamp' },
    resolution_notes: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('investigation_leads', 'investigation_id');
  pgm.createIndex('investigation_leads', 'status');
  pgm.createIndex('investigation_leads', 'source_document_id');
}

export async function down(pgm) {
  pgm.dropTable('investigation_leads');
}
