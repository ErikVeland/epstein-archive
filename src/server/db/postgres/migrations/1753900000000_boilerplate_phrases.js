/* eslint-disable no-undef */

/**
 * Migration: Add boilerplate_phrases table
 *
 * Referenced by discoveryRepository.addSentence() to track frequently-seen
 * sentences across documents and mark them as boilerplate.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS boilerplate_phrases (
      id                   BIGSERIAL PRIMARY KEY,
      sentence_hash        TEXT        NOT NULL UNIQUE,
      sentence_text_sample TEXT,
      frequency            INTEGER     NOT NULL DEFAULT 1,
      status               TEXT        NOT NULL DEFAULT 'candidate',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_boilerplate_phrases_hash
      ON boilerplate_phrases (sentence_hash);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS boilerplate_phrases;`);
}
