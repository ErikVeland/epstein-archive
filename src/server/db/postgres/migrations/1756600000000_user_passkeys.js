/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.user_passkeys (
      id            BIGSERIAL PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      credential_id TEXT UNIQUE NOT NULL,
      public_key    TEXT NOT NULL,
      counter       INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id
      ON public.user_passkeys (user_id);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS public.user_passkeys;`);
}
