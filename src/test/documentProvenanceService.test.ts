import { describe, expect, it } from 'vitest';
import { documentProvenanceService } from '../server/services/documentProvenanceService.js';

describe('documentProvenanceService.refreshDocumentSummary', () => {
  it('infers source system from sourceCollection instead of sourceRelease', async () => {
    const queries: Array<{ sql: string; params?: unknown[] }> = [];
    const executor = {
      query: async (sql: string, params?: unknown[]) => {
        queries.push({ sql, params });

        if (sql.includes('FROM documents d')) {
          return {
            rows: [
              {
                content_sha256: 'abc123',
                normalized_text_sha256: 'def456',
                source_collection: 'Department of Justice',
                source_system: 'doj_release',
                source_release: null,
                source_path: null,
                source_url: null,
                source_original_url: null,
                ingestion_run_id: 42,
                parent_document_id: null,
                event_count: 1,
                hash_event_count: 1,
                transform_event_count: 0,
                parent_event_count: 0,
              },
            ],
          };
        }

        return { rows: [] };
      },
    };

    await documentProvenanceService.refreshDocumentSummary(
      101,
      {
        normalizedTextSha256: 'def456',
        sourceCollection: 'Department of Justice',
      },
      executor,
    );

    const firstUpdate = queries.find(
      (entry) => entry.sql.includes('UPDATE documents') && Array.isArray(entry.params),
    );
    expect(firstUpdate?.params?.[4]).toBe('doj_release');
  });
});
