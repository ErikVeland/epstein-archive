import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exists: vi.fn(() => false),
  startRun: vi.fn(),
  updateRunStatus: vi.fn(),
  registerStep: vi.fn(),
  failActiveStageRuns: vi.fn(),
  ensureDatabase: vi.fn(),
  ensureHealthy: vi.fn(),
  runStage: vi.fn(),
  shuttingDown: vi.fn(() => false),
  twoStages: false,
  runtime: { watchdog: null, exitReason: null as string | null },
}));
vi.mock('fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: mocks.exists,
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));
vi.mock('../../scripts/pipeline/config.js', () => ({
  CHECKPOINT_DIR: './pipeline_checkpoints',
  PIPELINE_VERSION: 'test',
}));
vi.mock('../../scripts/pipeline/status.js', () => ({
  pipelineRuntime: mocks.runtime,
  isShuttingDown: mocks.shuttingDown,
  PipelineBlockedError: class extends Error {},
  updateHeartbeat: vi.fn(),
  installSignalHandlers: vi.fn(),
}));
vi.mock('../../scripts/pipeline/recovery.js', () => ({
  ensureDatabaseRunning: mocks.ensureDatabase,
  ensureServiceHealthyOrRecover: mocks.ensureHealthy,
  startWatchdog: vi.fn(),
}));
vi.mock('../../scripts/pipeline/stages.js', () => {
  const stages = [
    { name: 'media-extraction', description: 'Extract media', phase: 'Media', version: 'test' },
  ];
  return {
    UNIFIED_STAGES: stages,
    stagesForMode: () =>
      mocks.twoStages
        ? [
            ...stages,
            {
              name: 'analytics-refresh',
              description: 'Refresh analytics',
              phase: 'Analytics',
              version: 'test',
            },
          ]
        : stages,
  };
});
vi.mock('../../scripts/pipeline/runner.js', () => ({
  checkPipelineControlSignal: vi.fn(),
  runRegisteredScriptStage: mocks.runStage,
  runIngestPhase: vi.fn(),
  runIntelPhase: vi.fn(),
  runEnrichPhase: vi.fn(),
}));
vi.mock('../server/services/pipelineService.js', () => ({
  PipelineService: {
    startRun: mocks.startRun,
    updateRunStatus: mocks.updateRunStatus,
    registerStep: mocks.registerStep,
    failActiveStageRuns: mocks.failActiveStageRuns,
  },
}));

import { main } from '../../scripts/unified_pipeline.js';

const originalArgs = [...process.argv];
describe('finite corpus pipeline lifecycle', () => {
  afterEach(() => {
    process.argv = [...originalArgs];
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.twoStages = false;
    mocks.exists.mockReturnValue(false);
    mocks.shuttingDown.mockReturnValue(false);
    mocks.startRun.mockResolvedValue({ id: 123, run_uuid: 'test' });
    mocks.runStage.mockResolvedValue(0);
    mocks.runtime.exitReason = null;
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('allows one explicit maintenance pass without enabling database recovery', async () => {
    mocks.exists.mockReturnValue(true);
    process.argv = [...originalArgs, '--maintenance-pass'];
    await main();
    expect(mocks.runStage).toHaveBeenCalledTimes(1);
    expect(mocks.ensureDatabase).not.toHaveBeenCalled();
  });

  it('continues useful stages after a failed stage without repeating it', async () => {
    mocks.twoStages = true;
    mocks.runStage.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await main();
    expect(mocks.runStage).toHaveBeenCalledTimes(2);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('honours an intentional stop before database recovery or run creation', async () => {
    mocks.exists.mockReturnValue(true);
    await main();
    expect(mocks.ensureDatabase).not.toHaveBeenCalled();
    expect(mocks.startRun).not.toHaveBeenCalled();
    expect(mocks.runStage).not.toHaveBeenCalled();
  });

  it('exits after one successful pass without starting another cycle', async () => {
    await main();
    expect(mocks.runStage).toHaveBeenCalledTimes(1);
    expect(mocks.updateRunStatus).toHaveBeenCalledWith(123, 'succeeded', undefined);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('reports a failed stage and exits without repeating it', async () => {
    mocks.runStage.mockResolvedValue(1);
    await main();
    expect(mocks.runStage).toHaveBeenCalledTimes(1);
    expect(mocks.updateRunStatus).toHaveBeenCalledWith(
      123,
      'failed',
      expect.stringContaining('media-extraction'),
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('does not retry a blocked or crashed pass', async () => {
    mocks.runStage.mockRejectedValue(new Error('model unavailable'));
    await main();
    expect(mocks.runStage).toHaveBeenCalledTimes(1);
    expect(mocks.updateRunStatus).toHaveBeenCalledWith(
      123,
      'failed',
      expect.stringContaining('media-extraction'),
    );
    expect(mocks.failActiveStageRuns).toHaveBeenCalledWith(
      123,
      'media-extraction',
      'model unavailable',
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
