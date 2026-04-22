export async function up(pgm) {
  // Support table for entity resolution maintenance
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS entity_merge_candidates (
      id bigserial PRIMARY KEY,
      source_entity_id bigint NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      target_entity_id bigint NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      similarity_score float NOT NULL,
      reasoning text,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamp NOT NULL DEFAULT current_timestamp,
      updated_at timestamp NOT NULL DEFAULT current_timestamp
    );
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_source_target_merge'
      ) THEN
        ALTER TABLE entity_merge_candidates
        ADD CONSTRAINT unique_source_target_merge UNIQUE (source_entity_id, target_entity_id);
      END IF;
    END $$;
  `);

  // Enable trigram indices for fast fuzzy search
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS entities_name_trgm_idx ON entities USING gin (full_name gin_trgm_ops);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS flight_passengers_name_trgm_idx ON flight_passengers USING gin (passenger_name gin_trgm_ops);',
  );
}

export async function down(pgm) {
  pgm.dropIndex('flight_passengers', 'flight_passengers_name_trgm_idx');
  pgm.dropIndex('entities', 'entities_name_trgm_idx');
  pgm.dropTable('entity_merge_candidates');
}
