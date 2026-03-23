import { getApiPool } from '../db/connection.js';
import { randomUUID } from 'crypto';

export interface PipelineRun {
  id: number;
  run_uuid: string;
  pipeline_version: string;
  git_commit?: string;
  config_json?: string;
  environment_json?: string;
  started_at: string;
  status: 'running' | 'succeeded' | 'failed' | 'cancelled';
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
    status: 'succeeded' | 'failed' | 'cancelled',
    errorMessage?: string,
  ): Promise<void> {
    const pool = getApiPool();
    await pool.query(
      `
      UPDATE pipeline_runs 
      SET status = $1, error_message = $2, finished_at = CURRENT_TIMESTAMP 
      WHERE id = $3
    `,
      [status, errorMessage || null, id],
    );
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
};
