import { getApiPool } from './connection.js';

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)) : [];

const asRecordArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
      )
    : [];

export const bulkOperationsRepository = {
  // Bulk insert entities with pg client for performance
  bulkInsertEntities: async (entities: Record<string, unknown>[]) => {
    const pool = getApiPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const entityData of entities) {
        const { rows: entityRows } = await client.query(
          `
          INSERT INTO entities (full_name, primary_role, secondary_roles, likelihood_level, mentions, 
                               current_status, connections_summary, red_flag_rating, red_flag_score)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `,
          [
            entityData.fullName,
            entityData.primaryRole,
            entityData.secondaryRoles ? asStringArray(entityData.secondaryRoles).join(', ') : null,
            entityData.likelihoodLevel,
            entityData.mentions || 0,
            entityData.currentStatus,
            entityData.connectionsSummary,
            entityData.redFlagRating,
            entityData.redFlagScore || 0,
          ],
        );

        const entityId = entityRows[0].id;

        // Insert evidence types
        if (entityData.evidenceTypes && Array.isArray(entityData.evidenceTypes)) {
          for (const typeName of asStringArray(entityData.evidenceTypes)) {
            const { rows: typeRows } = await client.query(
              'SELECT id FROM evidence_types WHERE type_name = $1',
              [typeName],
            );
            if (typeRows.length > 0) {
              await client.query(
                `
                INSERT INTO entity_evidence_types (entity_id, evidence_type_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
              `,
                [entityId, typeRows[0].id],
              );
            }
          }
        }

        // Insert documents and mentions
        const fileReferences = asRecordArray(entityData.fileReferences);
        if (fileReferences.length > 0) {
          for (const fileRef of fileReferences) {
            const { rows: existingDocs } = await client.query(
              'SELECT id FROM documents WHERE file_path = $1',
              [fileRef.filePath],
            );

            if (existingDocs.length > 0) {
              // Document exists
            } else {
              await client.query(
                `
                INSERT INTO documents (file_name, file_path, file_type, file_size, date_created, content, metadata_json, word_count, red_flag_rating, content_hash)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
              `,
                [
                  fileRef.fileName || '',
                  fileRef.filePath || fileRef.path,
                  fileRef.fileType,
                  fileRef.fileSize || 0,
                  fileRef.dateCreated || new Date().toISOString(),
                  fileRef.content || '',
                  fileRef.metadataJson || '{}',
                  fileRef.wordCount || 0,
                  fileRef.redFlagRating || 0,
                  fileRef.md5Hash || '',
                ],
              );
            }
          }
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};
