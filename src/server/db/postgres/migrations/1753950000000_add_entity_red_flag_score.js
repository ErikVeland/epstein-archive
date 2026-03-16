/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entities' AND column_name = 'red_flag_score'
      ) THEN
        ALTER TABLE entities ADD COLUMN red_flag_score REAL DEFAULT 0;
      END IF;
    END $$;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE entities DROP COLUMN IF EXISTS red_flag_score;
  `);
}
