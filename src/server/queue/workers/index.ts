import { JobManager } from '../JobManager.js';
import { WorkerPool } from '../workerPool.js';
import { getWorkerConfig, type WorkerConfig } from '../workerConfig.js';
import { getIngestPool } from '../../db/connection.js';
import { logger } from '../../services/Logger.js';

export abstract class BaseWorker {
  protected readonly manager: JobManager;
  protected readonly pool: WorkerPool;
  protected readonly config: WorkerConfig;
  protected readonly name: string;
  private shutdownRequested = false;

  constructor(name: string, manager?: JobManager, config?: WorkerConfig) {
    this.name = name;
    this.manager = manager ?? new JobManager(`${name}-${process.pid}`);
    this.pool = new WorkerPool();
    this.config = config ?? getWorkerConfig();
  }

  abstract processJob(job: {
    id: number;
    file_path: string;
    source_collection: string | null;
  }): Promise<void>;

  async run(): Promise<void> {
    logger.info({ worker: this.name }, `Worker starting (concurrency=${this.config.concurrency})`);
    while (!this.shutdownRequested) {
      try {
        const jobs = await this.manager.acquireJobBatch(
          this.config.batchSize,
          this.config.leaseSeconds,
        );
        if (jobs.length === 0) {
          await this.sleep(5000);
          continue;
        }
        for (const job of jobs) {
          if (this.shutdownRequested) break;
          await this.pool.waitForCapacity(this.config.concurrency);
          this.pool.run(() => this.processWithHeartbeat(job));
        }
      } catch (err) {
        logger.error({ err, worker: this.name }, 'Worker cycle error');
        await this.sleep(5000);
      }
    }
    await this.pool.drain();
    logger.info({ worker: this.name }, 'Worker stopped');
  }

  async stop(): Promise<void> {
    this.shutdownRequested = true;
  }

  protected async processWithHeartbeat(job: {
    id: number;
    file_path: string;
    source_collection: string | null;
  }): Promise<void> {
    const heartbeat = setInterval(
      async () => {
        try {
          await this.manager.renewLease(job.id, this.config.leaseSeconds);
        } catch {
          /* best effort */
        }
      },
      (this.config.leaseSeconds * 1000) / 3,
    );

    try {
      await this.processJob(job);
      await this.manager.completeJob(job.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.manager.failJob(job.id, message);
      logger.error({ err, documentId: job.id, worker: this.name }, 'Job failed');
    } finally {
      clearInterval(heartbeat);
    }
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class IngestWorker extends BaseWorker {
  constructor() {
    super('ingest');
  }

  async processJob(job: {
    id: number;
    file_path: string;
    source_collection: string | null;
  }): Promise<void> {
    const pool = getIngestPool();
    await pool.query(`UPDATE documents SET processing_status = 'processing' WHERE id = $1`, [
      job.id,
    ]);
    logger.info({ documentId: job.id }, 'Processing ingest job');
  }
}

export class AIEnrichmentWorker extends BaseWorker {
  constructor() {
    super('ai-enrichment');
  }

  async processJob(job: {
    id: number;
    file_path: string;
    source_collection: string | null;
  }): Promise<void> {
    logger.info({ documentId: job.id }, 'Processing AI enrichment job');
  }
}

export class MediaThumbnailWorker extends BaseWorker {
  constructor() {
    super('media-thumbnail');
  }

  async processJob(job: {
    id: number;
    file_path: string;
    source_collection: string | null;
  }): Promise<void> {
    logger.info({ documentId: job.id }, 'Processing thumbnail job');
  }
}
