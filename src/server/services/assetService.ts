import { getApiPool } from '../db/connection.js';
import { randomUUID } from 'crypto';
import { basename, extname } from 'path';

export interface FileAsset {
  id: number;
  asset_uuid: string;
  storage_path: string;
  sha256: string;
  mime_type: string;
  file_size: number;
}

export const AssetService = {
  /**
   * Register a file as an asset.
   */
  async registerAsset(data: {
    storagePath: string;
    sha256: string;
    mimeType: string;
    fileSize: number;
    sourceCollection?: string;
    isOriginal?: boolean;
    originalAssetId?: number;
    derivativeKind?: string;
    derivativeParamsJson?: string;
    phash?: string;
  }): Promise<number> {
    const pool = getApiPool();
    const assetUuid = randomUUID();
    const fileName = basename(data.storagePath);
    const fileType = extname(data.storagePath).replace('.', '').toUpperCase();

    const { rows } = await pool.query(
      `
      INSERT INTO file_assets (
        asset_uuid, original_asset_id, storage_path, file_name, 
        mime_type, file_type, file_size, sha256, 
        source_collection, is_original, is_derivative, 
        derivative_kind, derivative_params_json, phash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `,
      [
        assetUuid,
        data.originalAssetId || null,
        data.storagePath,
        fileName,
        data.mimeType,
        fileType,
        data.fileSize,
        data.sha256,
        data.sourceCollection || null,
        data.isOriginal !== false ? 1 : 0,
        data.isOriginal === false ? 1 : 0,
        data.derivativeKind || null,
        data.derivativeParamsJson || null,
        data.phash || null,
      ],
    );

    return rows[0].id;
  },

  /**
   * Link an asset to a document.
   */
  async linkToDocument(
    documentId: number,
    assetId: number,
    role: string = 'primary',
  ): Promise<void> {
    const pool = getApiPool();
    await pool.query(
      `
      INSERT INTO document_assets (document_id, asset_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (document_id, asset_id) DO NOTHING
    `,
      [documentId, assetId, role],
    );
  },

  /**
   * Find asset by SHA-256.
   */
  async findBySha256(sha256: string): Promise<number | null> {
    const pool = getApiPool();
    const { rows } = await pool.query('SELECT id FROM file_assets WHERE sha256 = $1', [sha256]);
    return rows.length > 0 ? rows[0].id : null;
  },
};
