/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.createTable('redaction_document_scans', {
    document_id: {
      type: 'bigint',
      primaryKey: true,
      references: 'documents(id)',
      onDelete: 'CASCADE',
    },
    source_sha256: { type: 'text' },
    overlay_scanned_at: { type: 'timestamptz' },
    context_scanned_at: { type: 'timestamptz' },
    scanner_version: { type: 'text', notNull: true },
    error_text: { type: 'text' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createTable('redaction_findings', {
    id: { type: 'bigserial', primaryKey: true },
    document_id: {
      type: 'bigint',
      notNull: true,
      references: 'documents(id)',
      onDelete: 'CASCADE',
    },
    page_number: { type: 'integer' },
    span_start: { type: 'integer' },
    span_end: { type: 'integer' },
    finding_type: { type: 'text', notNull: true },
    source_text: { type: 'text' },
    bbox_json: { type: 'jsonb' },
    inferred_class: { type: 'text' },
    candidates_json: { type: 'jsonb', notNull: true, default: '[]' },
    confidence: { type: 'real', notNull: true, default: 0 },
    evidence_json: { type: 'jsonb', notNull: true, default: '[]' },
    method: { type: 'text', notNull: true },
    model_id: { type: 'text' },
    prompt_version: { type: 'text' },
    source_sha256: { type: 'text' },
    review_status: { type: 'text', notNull: true, default: 'pending' },
    reviewed_by: { type: 'text', references: 'users(id)', onDelete: 'SET NULL' },
    reviewed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('redaction_findings', 'redaction_findings_type_check', {
    check:
      "finding_type IN ('overlay_text_exposed', 'contextual_hypothesis', 'unresolved_redaction')",
  });
  pgm.addConstraint('redaction_findings', 'redaction_findings_confidence_check', {
    check: 'confidence >= 0 AND confidence <= 1',
  });
  pgm.addConstraint('redaction_findings', 'redaction_findings_review_check', {
    check: "review_status IN ('pending', 'corroborated', 'rejected')",
  });
  pgm.createIndex('redaction_findings', ['document_id', 'page_number']);
  pgm.createIndex('redaction_findings', ['finding_type', 'review_status', 'confidence']);
}

export async function down(pgm) {
  pgm.dropTable('redaction_findings');
  pgm.dropTable('redaction_document_scans');
}
