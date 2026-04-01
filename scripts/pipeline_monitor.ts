#!/usr/bin/env tsx
/**
 * pipeline_monitor.ts — real-time ingest pipeline dashboard
 *
 * Usage:
 *   pnpm tsx scripts/pipeline_monitor.ts
 *   pnpm tsx scripts/pipeline_monitor.ts --interval 10   # refresh every 10s
 */

import { execFileSync } from 'child_process';
import { getApiPool } from '../src/server/db/connection.js';

// Suppress PG_QUERY slow-query warnings — monitor polls are intentionally frequent
const _warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('[PG_QUERY]')) return;
  _warn(...args);
};

const intervalFlagIdx = process.argv.indexOf('--interval');
const intervalArg =
  process.argv.find((a) => a.startsWith('--interval='))?.split('=')[1] ??
  (intervalFlagIdx !== -1 ? process.argv[intervalFlagIdx + 1] : undefined) ??
  '5';
const INTERVAL_MS = (parseInt(intervalArg, 10) || 5) * 1000;
const BAR_WIDTH = 40;

// ── ANSI helpers ────────────────────────────────────────────────────────────
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;

const clear = () => process.stdout.write('\x1b[H\x1b[2J\x1b[3J');
const hideCursor = () => process.stdout.write('\x1b[?25l');
const showCursor = () => process.stdout.write('\x1b[?25h');

function progressBar(done: number, total: number): string {
  const pct = total > 0 ? done / total : 0;
  const filled = Math.round(pct * BAR_WIDTH);
  const bar = green('█'.repeat(filled)) + dim('░'.repeat(BAR_WIDTH - filled));
  return `[${bar}] ${(pct * 100).toFixed(1)}%`;
}

function fmtDuration(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

// ── DB snapshot ──────────────────────────────────────────────────────────────
interface Snapshot {
  ts: number;
  succeeded: number;
  completed: number;
  queued: number;
  failed: number;
  total: number;
  lastActivity: Date | null;
  byCollection: Array<{ name: string; done: number; total: number }>;
}

async function snapshot(): Promise<Snapshot> {
  const pool = getApiPool();

  const [statusRes, activityRes, collectionRes] = await Promise.all([
    pool.query<{ processing_status: string; count: string }>(`
      SELECT processing_status, COUNT(*) AS count
      FROM documents
      GROUP BY processing_status
    `),
    pool.query<{ last_processed_at: Date | null }>(`
      SELECT MAX(last_processed_at) AS last_processed_at FROM documents
    `),
    pool.query<{ source_collection: string; done: string; total: string }>(`
      SELECT
        COALESCE(source_collection, 'Unknown') AS source_collection,
        COUNT(*) FILTER (WHERE processing_status IN ('succeeded','completed')) AS done,
        COUNT(*) AS total
      FROM documents
      GROUP BY source_collection
      ORDER BY total DESC
      LIMIT 10
    `),
  ]);

  const counts: Record<string, number> = {};
  for (const row of statusRes.rows) counts[row.processing_status] = parseInt(row.count, 10);

  const succeeded = counts['succeeded'] ?? 0;
  const completed = counts['completed'] ?? 0;
  const queued = counts['queued'] ?? 0;
  const failed = counts['failed'] ?? 0;

  return {
    ts: Date.now(),
    succeeded,
    completed,
    queued,
    failed,
    total: succeeded + completed + queued + failed,
    lastActivity: activityRes.rows[0]?.last_processed_at ?? null,
    byCollection: collectionRes.rows.map((r) => ({
      name: r.source_collection,
      done: parseInt(r.done, 10),
      total: parseInt(r.total, 10),
    })),
  };
}

// ── Rate (rolling window) ────────────────────────────────────────────────────
const WINDOW_SIZE = 6; // smoothed over ~30s at default interval
const history: Snapshot[] = [];

function docsPerMinute(current: Snapshot): number {
  if (history.length < 2) return 0;
  const oldest = history[0]!;
  const elapsedMin = (current.ts - oldest.ts) / 60_000;
  if (elapsedMin === 0) return 0;
  const delta = current.succeeded + current.completed - (oldest.succeeded + oldest.completed);
  return Math.max(0, delta / elapsedMin);
}

// ── Pipeline process check ───────────────────────────────────────────────────
function isPipelineRunning(): boolean {
  try {
    execFileSync('pgrep', ['-f', 'tsx.*ingest_pipeline'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ── Render ───────────────────────────────────────────────────────────────────
function render(current: Snapshot): void {
  clear();

  const done = current.succeeded + current.completed;
  const rate = docsPerMinute(current);
  const etaMin = rate > 0 ? current.queued / rate : Infinity;
  const running = isPipelineRunning();
  const now = new Date().toLocaleTimeString('en-US', { hour12: false });
  const lastSeen = current.lastActivity
    ? current.lastActivity.toLocaleTimeString('en-US', { hour12: false })
    : 'never';

  const out: string[] = [
    '',
    `  ${bold('Epstein Ingest Pipeline')}  ${dim('—')}  ${dim(now)}  ` +
      (running ? green('● running') : red('● stopped')),
    '',
    `  ${progressBar(done, current.total)}`,
    '',
    `  ${bold(fmtNum(done))} done  ${dim('/')}  ${bold(fmtNum(current.total))} total  ` +
      `${dim('·')}  ${yellow(fmtNum(current.queued))} queued  ${red(fmtNum(current.failed))} failed`,
    '',
    `  Rate  ${cyan(rate > 0 ? `${rate.toFixed(1)} docs/min` : '—')}  ` +
      `${dim('|')}  ETA  ${cyan(fmtDuration(etaMin))}  ` +
      `${dim('|')}  Last activity  ${dim(lastSeen)}`,
    '',
    `  ${dim('─'.repeat(62))}`,
    `  ${dim('Collection breakdown:')}`,
    '',
  ];

  for (const col of current.byCollection) {
    const pct = col.total > 0 ? (col.done / col.total) * 100 : 0;
    const indicator = pct >= 100 ? green('✓') : pct > 0 ? yellow('◌') : dim('○');
    const shortName = col.name
      .replace(/^DOJ Discovery /, '')
      .replace(/^Epstein Estate Documents - /, '');
    out.push(
      `  ${dim(fmtNum(col.done).padStart(7))} / ${dim(fmtNum(col.total).padStart(7))}` +
        `  ${indicator}  ${shortName}`,
    );
  }

  out.push('');
  out.push(dim(`  Refreshes every ${INTERVAL_MS / 1000}s — Ctrl+C to exit`));
  out.push('');

  process.stdout.write(out.join('\n'));
}

// ── Main loop ────────────────────────────────────────────────────────────────
async function main() {
  hideCursor();

  process.on('SIGINT', () => {
    showCursor();
    process.stdout.write('\n');
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    showCursor();
    process.exit(0);
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const snap = await snapshot();
      if (history.length >= WINDOW_SIZE) history.shift();
      history.push(snap);
      render(snap);
    } catch (err) {
      clear();
      process.stdout.write(`\n  ${red('DB error:')} ${String(err)}\n`);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main();
