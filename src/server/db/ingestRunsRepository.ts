import { getApiPool } from './connection.js';

export interface IngestRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'success' | 'failed';
  gitCommit: string | null;
  schemaVersion: string | null;
  pipelineVersion: string | null;
  extractorVersions: Record<string, unknown> | null;
  ocrVersions: Record<string, unknown> | null;
  agenticEnabled: boolean;
  agenticModelId: string | null;
  agenticPromptVersion: string | null;
  agenticParams: Record<string, unknown> | null;
  notes: string | null;
}

interface IngestRunListRow {
  id: string | number;
  startedAt: string;
  finishedAt: string | null;
  status: IngestRun['status'];
  gitCommit: string | null;
  pipelineVersion: string | null;
  agenticEnabled: boolean | null;
  notes: string | null;
}

export class IngestRunsRepository {
  /**
   * Get all ingest runs
   */
  static async getRuns(limit: number = 20): Promise<IngestRun[]> {
    const pool = getApiPool();

    const res = await pool.query(
      `
      SELECT 
        id,
        created_at as "startedAt",
        finished_at as "finishedAt",
        status,
        git_commit as "gitCommit",
        pipeline_version as "pipelineVersion",
        agentic_enabled as "agenticEnabled",
        notes
      FROM ingest_runs 
      ORDER BY created_at DESC 
      LIMIT $1
    `,
      [limit],
    );

    return (res.rows as IngestRunListRow[]).map((row) => ({
      id: String(row.id),
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      status: row.status,
      gitCommit: row.gitCommit,
      pipelineVersion: row.pipelineVersion,
      agenticEnabled: Boolean(row.agenticEnabled),
      extractorVersions: null,
      ocrVersions: null,
      agenticParams: null,
      schemaVersion: null,
      agenticModelId: null,
      agenticPromptVersion: null,
      notes: row.notes,
    }));
  }

  /**
   * Get latest successful run
   */
  static async getLatestSuccess(): Promise<IngestRun | null> {
    const pool = getApiPool();

    const res = await pool.query(
      `
      SELECT * FROM ingest_runs 
      WHERE status = 'success' 
      ORDER BY finished_at DESC 
      LIMIT 1
    `,
    );

    const row = res.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      startedAt: row.created_at,
      finishedAt: row.finished_at,
      status: row.status,
      gitCommit: row.git_commit,
      schemaVersion: null,
      pipelineVersion: row.pipeline_version,
      extractorVersions: null,
      ocrVersions: null,
      agenticEnabled: Boolean(row.agentic_enabled),
      agenticModelId: null,
      agenticPromptVersion: null,
      agenticParams: null,
      notes: row.notes,
    };
  }
}

export const ingestRunsRepository = IngestRunsRepository;
