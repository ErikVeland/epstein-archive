import { getApiPool } from './connection.js';

interface ClusterUpdateInput {
  id: string;
  name?: string;
  isHidden?: boolean;
  entityId?: number | null;
}

export const faceClustersRepository = {
  listClusters: async () => {
    const { rows } = await getApiPool().query(
      `
        SELECT
          fc.id,
          fc.name,
          fc.is_hidden,
          fc.entity_id,
          fc.created_at,
          e.full_name AS entity_name,
          COUNT(f.id) as face_count,
          (
            SELECT f2.crop_path
            FROM faces f2
            WHERE f2.id = fc.representative_face_id
          ) as thumbnail_path
        FROM face_clusters fc
        LEFT JOIN faces f ON f.cluster_id = fc.id
        LEFT JOIN entities e ON e.id = fc.entity_id
        GROUP BY fc.id, e.full_name
        ORDER BY
          CASE WHEN fc.name LIKE 'Person %' THEN 1 ELSE 0 END,
          COUNT(f.id) DESC
      `,
    );
    return rows;
  },

  getClusterById: async (id: string) => {
    const { rows } = await getApiPool().query(
      `
        SELECT
          fc.id,
          fc.name,
          fc.is_hidden,
          fc.representative_face_id,
          fc.created_at,
          fc.updated_at,
          fc.entity_id,
          e.full_name AS entity_name
        FROM face_clusters fc
        LEFT JOIN entities e ON e.id = fc.entity_id
        WHERE fc.id = $1
      `,
      [id],
    );
    return rows[0] ?? null;
  },

  getFacesByClusterId: async (id: string) => {
    const { rows } = await getApiPool().query(
      `
        SELECT
          f.id,
          f.media_item_id,
          f.crop_path,
          f.detection_confidence,
          m.file_path as original_image_path
        FROM faces f
        JOIN media_items m ON f.media_item_id = m.id
        WHERE f.cluster_id = $1
        ORDER BY f.detection_confidence DESC
      `,
      [id],
    );
    return rows;
  },

  updateCluster: async ({ id, name, isHidden, entityId }: ClusterUpdateInput) => {
    const pool = getApiPool();
    const updates: string[] = [];
    const values: Array<string | boolean | number | null> = [];
    let paramIdx = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      values.push(name);
    }
    if (isHidden !== undefined) {
      updates.push(`is_hidden = $${paramIdx++}`);
      values.push(isHidden);
    }
    if (entityId !== undefined) {
      updates.push(`entity_id = $${paramIdx++}`);
      values.push(entityId);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE face_clusters
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIdx}
       RETURNING *`,
      values,
    );
    const updated = rows[0] ?? null;
    if (!updated) return null;

    // When an entity is linked, backfill media_item_people so every photo
    // in this cluster appears under that person in the PhotoBrowser.
    if (entityId != null) {
      await pool.query(
        `INSERT INTO media_item_people (media_item_id, entity_id)
         SELECT DISTINCT f.media_item_id::bigint, $1
         FROM faces f
         WHERE f.cluster_id = $2
         ON CONFLICT DO NOTHING`,
        [entityId, id],
      );
    }

    // Include entity_name in response
    const { rows: withEntity } = await pool.query(
      `SELECT fc.*, e.full_name AS entity_name
       FROM face_clusters fc
       LEFT JOIN entities e ON e.id = fc.entity_id
       WHERE fc.id = $1`,
      [id],
    );
    return withEntity[0] ?? updated;
  },

  /** Count how many photos in a cluster are already in media_item_people for an entity */
  countLinkedPhotos: async (clusterId: string, entityId: number): Promise<number> => {
    const { rows } = await getApiPool().query(
      `SELECT COUNT(DISTINCT f.media_item_id) AS n
       FROM faces f
       WHERE f.cluster_id = $1
         AND EXISTS (
           SELECT 1 FROM media_item_people mip
           WHERE mip.media_item_id = f.media_item_id::bigint
             AND mip.entity_id = $2
         )`,
      [clusterId, entityId],
    );
    return parseInt(rows[0].n, 10);
  },
};
