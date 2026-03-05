/* eslint-disable no-undef */

export async function up(pgm) {
  pgm.addColumns('documents', {
    pipeline_version: { type: 'text' },
    ingestion_run_id: { type: 'text' },
    hash_algo: { type: 'text', default: 'sha256' },
  });

  pgm.createIndex('documents', 'pipeline_version');
  pgm.createIndex('documents', 'ingestion_run_id');
}

export async function down(pgm) {
  pgm.dropColumns('documents', ['pipeline_version', 'ingestion_run_id', 'hash_algo']);
}
