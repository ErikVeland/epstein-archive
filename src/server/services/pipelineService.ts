import { getApiPool } from '../db/connection.js';
import { randomUUID } from 'crypto';
import { logger } from './Logger.js';

export interface PipelineRun {
  id: number;
  run_uuid: string;
  pipeline_version: string;
  git_commit?: string;
  config_json?: string;
  environment_json?: string;
  started_at: string;
  status: 'running' | 'paused' | 'succeeded' | 'failed' | 'cancelled';
}

export interface PipelineStageRun {
  id: number;
  runId: number | null;
  documentId: number | null;
  stageName: string;
  stageVersion: string;
  status: string;
}

export const PipelineService = {
  /**
   * Start a new pipeline run.
   */
  async startRun(version: string, config: Record<string, unknown> = {}): Promise<PipelineRun> {
    const pool = getApiPool();
    const runUuid = randomUUID();
    const gitCommit = await this.getCurrentGitCommit();
    const envJson = JSON.stringify({
      os: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
    });

    const { rows } = await pool.query(
      `
      INSERT INTO pipeline_runs (
        run_uuid, pipeline_version, git_commit, config_json, environment_json, status
      ) VALUES ($1, $2, $3, $4, $5, 'running')
      RETURNING id
    `,
      [runUuid, version, gitCommit, JSON.stringify(config), envJson],
    );

    return {
      id: rows[0].id,
      run_uuid: runUuid,
      pipeline_version: version,
      git_commit: gitCommit,
      config_json: JSON.stringify(config),
      environment_json: envJson,
      started_at: new Date().toISOString(),
      status: 'running',
    };
  },

  /**
   * Update run status.
   */
  async updateRunStatus(
    id: number,
    status: 'running' | 'succeeded' | 'failed' | 'cancelled' | 'paused',
    errorMessage?: string,
  ): Promise<void> {
    const pool = getApiPool();
    await pool.query(
      `
      UPDATE pipeline_runs 
      SET status = $1, error_message = $2, 
          finished_at = CASE WHEN $1 IN ('succeeded', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE finished_at END
      WHERE id = $3
    `,
      [status, errorMessage || null, id],
    );
  },

  /**
   * Set a control signal for a run.
   */
  async setControlSignal(id: number, signal: 'pause' | 'resume' | 'stop' | null): Promise<void> {
    const pool = getApiPool();
    await pool.query('UPDATE pipeline_runs SET control_signal = $1 WHERE id = $2', [signal, id]);
  },

  /**
   * Get the current status/signal for a run.
   */
  async getRunStatus(id: number): Promise<{ status: string; control_signal: string | null }> {
    const pool = getApiPool();
    const { rows } = await pool.query(
      'SELECT status, control_signal FROM pipeline_runs WHERE id = $1',
      [id],
    );
    return {
      status: rows[0]?.status || 'unknown',
      control_signal: rows[0]?.control_signal || null,
    };
  },

  /**
   * Helper to get current git commit.
   */
  async getCurrentGitCommit(): Promise<string | undefined> {
    try {
      const { execSync } = await import('child_process');
      return execSync('git rev-parse HEAD').toString().trim();
    } catch (_e) {
      return undefined;
    }
  },

  /**
   * Register a step.
   */
  async registerStep(name: string, description: string): Promise<void> {
    const pool = getApiPool();
    await pool.query(
      `
      INSERT INTO pipeline_steps (step_name, description)
      VALUES ($1, $2)
      ON CONFLICT (step_name) DO NOTHING
    `,
      [name, description],
    );
  },

  async startStageRun(params: {
    runId?: number | null;
    documentId?: number | null;
    stageName: string;
    stageVersion?: string;
    inputHash?: string | null;
    modelId?: string | null;
    metrics?: Record<string, unknown>;
  }): Promise<PipelineStageRun | null> {
    const pool = getApiPool();
    try {
      const stageVersion = params.stageVersion || '1';
      const { rows } = await pool.query(
        `
        INSERT INTO document_stage_runs (
          run_id, document_id, stage_name, stage_version, input_hash, model_id,
          status, attempts, metrics_json, started_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'running', 1, $7::jsonb, NOW(), NOW())
        ON CONFLICT (
          COALESCE(document_id, 0),
          stage_name,
          stage_version,
          COALESCE(input_hash, ''),
          COALESCE(model_id, '')
        )
        DO UPDATE SET
          run_id = EXCLUDED.run_id,
          status = 'running',
          attempts = document_stage_runs.attempts + 1,
          error_message = NULL,
          metrics_json = document_stage_runs.metrics_json || EXCLUDED.metrics_json,
          started_at = NOW(),
          finished_at = NULL,
          updated_at = NOW()
        RETURNING id, run_id, document_id, stage_name, stage_version, status
      `,
        [
          params.runId || null,
          params.documentId || null,
          params.stageName,
          stageVersion,
          params.inputHash || null,
          params.modelId || null,
          JSON.stringify(params.metrics || {}),
        ],
      );

      const row = rows[0];
      if (!row) return null;
      return {
        id: Number(row.id),
        runId: row.run_id === null ? null : Number(row.run_id),
        documentId: row.document_id === null ? null : Number(row.document_id),
        stageName: row.stage_name,
        stageVersion: row.stage_version,
        status: row.status,
      };
    } catch {
      return null;
    }
  },

  async finishStageRun(
    id: number | null | undefined,
    params: {
      status: 'succeeded' | 'failed' | 'skipped' | 'cancelled';
      outputHash?: string | null;
      errorMessage?: string | null;
      metrics?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!id) return;
    const pool = getApiPool();
    try {
      await pool.query(
        `
        UPDATE document_stage_runs
        SET status = $1,
            output_hash = $2,
            error_message = $3,
            metrics_json = metrics_json || $4::jsonb,
            finished_at = NOW(),
            updated_at = NOW()
        WHERE id = $5
      `,
        [
          params.status,
          params.outputHash || null,
          params.errorMessage || null,
          JSON.stringify(params.metrics || {}),
          id,
        ],
      );
    } catch {
      // Stage telemetry should never fail the pipeline itself.
    }
  },

  async upsertAiArtifact(params: {
    runId?: number | null;
    stageRunId?: number | null;
    documentId: number;
    artifactType: string;
    artifactVersion?: string;
    modelId?: string | null;
    promptVersion?: string | null;
    sourceExcerpt?: string | null;
    outputText?: string | null;
    outputJson?: Record<string, unknown> | unknown[] | null;
    confidence?: number | null;
    reviewState?: string;
    provenance?: Record<string, unknown>;
  }): Promise<void> {
    const pool = getApiPool();
    try {
      await pool.query(
        `
        INSERT INTO document_ai_artifacts (
          run_id, stage_run_id, document_id, artifact_type, artifact_version,
          model_id, prompt_version, source_excerpt, output_text, output_json,
          confidence, review_state, provenance_json, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13::jsonb, NOW(), NOW())
        ON CONFLICT (
          document_id,
          artifact_type,
          artifact_version,
          COALESCE(model_id, ''),
          COALESCE(prompt_version, '')
        )
        DO UPDATE SET
          run_id = EXCLUDED.run_id,
          stage_run_id = EXCLUDED.stage_run_id,
          source_excerpt = EXCLUDED.source_excerpt,
          output_text = EXCLUDED.output_text,
          output_json = EXCLUDED.output_json,
          confidence = EXCLUDED.confidence,
          review_state = EXCLUDED.review_state,
          provenance_json = EXCLUDED.provenance_json,
          updated_at = NOW()
      `,
        [
          params.runId || null,
          params.stageRunId || null,
          params.documentId,
          params.artifactType,
          params.artifactVersion || '1',
          params.modelId || null,
          params.promptVersion || null,
          params.sourceExcerpt || null,
          params.outputText || null,
          params.outputJson ? JSON.stringify(params.outputJson) : null,
          params.confidence ?? null,
          params.reviewState || 'unreviewed',
          JSON.stringify(params.provenance || {}),
        ],
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      logger.warn(
        { documentId: params.documentId, err: (error as Error).message },
        '[PipelineService] Failed to persist AI artifact',
      );
    }
  },
};
