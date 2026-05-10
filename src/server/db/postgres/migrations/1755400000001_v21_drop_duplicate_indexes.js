/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_boilerplate_phrases_hash;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_documents_fts;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entities_full_name_trgm;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_flight_passengers_flight_id;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_flight_passengers_passenger_name;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_forensic_signals_type;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_forensic_signals_status;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_investigation_leads_inv;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_investigation_leads_status;`);
}

export async function down(pgm) {
  pgm.noTransaction();

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boilerplate_phrases_hash
    ON public.boilerplate_phrases (sentence_hash);
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_fts
    ON public.documents USING gin (fts_vector);
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_full_name_trgm
    ON public.entities USING gin (full_name gin_trgm_ops);
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flight_passengers_flight_id
    ON public.flight_passengers (flight_id);
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flight_passengers_passenger_name
    ON public.flight_passengers (passenger_name);
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forensic_signals_type
    ON public.forensic_signals (signal_type);
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forensic_signals_status
    ON public.forensic_signals (status);
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigation_leads_inv
    ON public.investigation_leads (investigation_id);
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigation_leads_status
    ON public.investigation_leads (status);
  `);
}
