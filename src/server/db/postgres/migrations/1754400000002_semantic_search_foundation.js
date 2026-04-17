export async function up(pgm) {
  // 1. Enable pgvector if available
  // Note: We wrap in try-catch in the actual DB execution context often,
  // but for migration we define the intent.
  pgm.sql('CREATE EXTENSION IF NOT EXISTS vector;');

  // 2. Add embedding columns to core forensic tables
  // We use 384 dimensions for light local models (e.g. all-MiniLM-L6-v2)
  // or 1536 for OpenAI/typical cloud models.
  pgm.addColumns('documents', {
    content_embedding: { type: 'vector(384)' },
  });

  pgm.addColumns('entities', {
    description_embedding: { type: 'vector(384)' },
  });

  // 3. Create vector indexes (HNSW for high performance at scale)
  // cosine similarity is standard for semantic search
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS documents_semantic_idx ON documents USING hnsw (content_embedding vector_cosine_ops);',
  );
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS entities_semantic_idx ON entities USING hnsw (description_embedding vector_cosine_ops);',
  );
}

export async function down(pgm) {
  pgm.dropColumn('entities', ['description_embedding']);
  pgm.dropColumn('documents', ['content_embedding']);
  pgm.sql('DROP EXTENSION IF EXISTS vector;');
}
