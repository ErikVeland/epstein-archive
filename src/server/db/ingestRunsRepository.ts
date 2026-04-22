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
        run_uuid as "uuid",
        started_at as "startedAt",
        finished_at as "finishedAt",
        status,
        git_commit as "gitCommit",
        pipeline_version as "pipelineVersion",
        config_json as "config"
      FROM pipeline_runs 
      ORDER BY started_at DESC 
      LIMIT $1
    `,
      [limit],
    );

    return (
      res.rows as Array<{
        id: number;
        uuid: string;
        startedAt: string;
        finishedAt: string | null;
        status: string;
        gitCommit: string | null;
        pipelineVersion: string;
        config: Record<string, unknown> | null;
      }>
    ).map((row) => ({
      id: String(row.id),
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      status:
        row.status === 'succeeded' ? 'success' : row.status === 'running' ? 'running' : 'failed',
      gitCommit: row.gitCommit,
      pipelineVersion: row.pipelineVersion,
      agenticEnabled: row.config?.agentic_enabled ?? false,
      extractorVersions: row.config?.step_versions ?? null,
      ocrVersions: null,
      agenticParams: null,
      schemaVersion: null,
      agenticModelId: null,
      agenticPromptVersion: null,
      notes: row.config?.notes || null,
    }));
  }

  /**
   * Get latest successful run
   */
  static async getLatestSuccess(): Promise<IngestRun | null> {
    const pool = getApiPool();

    const res = await pool.query(
      `
      SELECT * FROM pipeline_runs 
      WHERE status = 'succeeded' 
      ORDER BY finished_at DESC 
      LIMIT 1
    `,
    );

    const row = res.rows[0];
    if (!row) return null;

    return {
      id: String(row.id),
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: 'success',
      gitCommit: row.git_commit,
      schemaVersion: null,
      pipelineVersion: row.pipeline_version,
      extractorVersions: row.config_json?.step_versions ?? null,
      ocrVersions: null,
      agenticEnabled: row.config_json?.agentic_enabled ?? false,
      agenticModelId: null,
      agenticPromptVersion: null,
      agenticParams: null,
      notes: row.config_json?.notes || null,
    };
  }
}

export const ingestRunsRepository = IngestRunsRepository;
