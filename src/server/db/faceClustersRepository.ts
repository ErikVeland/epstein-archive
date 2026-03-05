import { getApiPool } from './connection.js';

interface ClusterUpdateInput {
  id: string;
  name?: string;
  isHidden?: boolean;
}

export const faceClustersRepository = {
  listClusters: async () => {
    const { rows } = await getApiPool().query(
      `
        SELECT
          fc.id,
          fc.name,
          fc.is_hidden,
          fc.created_at,
          COUNT(f.id) as face_count,
          (
            SELECT f2.crop_path
            FROM faces f2
            WHERE f2.id = fc.representative_face_id
          ) as thumbnail_path
        FROM face_clusters fc
        LEFT JOIN faces f ON f.cluster_id = fc.id
        GROUP BY fc.id
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
        SELECT *
        FROM face_clusters
        WHERE id = $1
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

  updateCluster: async ({ id, name, isHidden }: ClusterUpdateInput) => {
    const updates: string[] = [];
    const values: Array<string | boolean> = [];
    let paramIdx = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      values.push(name);
    }

    if (isHidden !== undefined) {
      updates.push(`is_hidden = $${paramIdx++}`);
      values.push(isHidden);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(id);
    const { rows } = await getApiPool().query(
      `
        UPDATE face_clusters
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIdx}
        RETURNING *
      `,
      values,
    );

    return rows[0] ?? null;
  },
};
