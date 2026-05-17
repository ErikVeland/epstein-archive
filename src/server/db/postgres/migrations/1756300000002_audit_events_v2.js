/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.audit_events_v2 (
      id              BIGSERIAL PRIMARY KEY,
      event_uuid      UUID NOT NULL DEFAULT gen_random_uuid(),
      actor_id        TEXT NOT NULL,
      actor_type      TEXT NOT NULL,
      action          TEXT NOT NULL,
      target_type     TEXT,
      target_id       TEXT,
      payload_json    JSONB,
      ip_address      TEXT,
      request_id      TEXT,
      prev_event_hash TEXT,
      event_hash      TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_audit_events_v2_created
      ON public.audit_events_v2 (created_at DESC);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_audit_events_v2_actor_action
      ON public.audit_events_v2 (actor_id, action, created_at DESC);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS public.audit_events_v2;`);
}
