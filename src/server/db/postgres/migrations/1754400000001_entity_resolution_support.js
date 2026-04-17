export async function up(pgm) {
  // Support table for entity resolution maintenance
  pgm.createTable('entity_merge_candidates', {
    id: 'id',
    source_entity_id: {
      type: 'bigint',
      notNull: true,
      references: 'entities(id)',
      onDelete: 'CASCADE',
    },
    target_entity_id: {
      type: 'bigint',
      notNull: true,
      references: 'entities(id)',
      onDelete: 'CASCADE',
    },
    similarity_score: { type: 'float', notNull: true },
    reasoning: { type: 'text' },
    status: { type: 'text', default: 'pending', notNull: true }, // pending, approved, rejected
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp'), notNull: true },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp'), notNull: true },
  });

  pgm.addConstraint('entity_merge_candidates', 'unique_source_target_merge', {
    unique: ['source_entity_id', 'target_entity_id'],
  });

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
