/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
      ON refresh_tokens(user_id);
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
      ON refresh_tokens(expires_at);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS refresh_tokens;`);
}
