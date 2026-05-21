/**
 * Bundle Budget CI Gate
 *
 * Enforces hard limits on bundle sizes after `pnpm build:client`.
 * Uses real gzip compression (zlib) — not an approximation.
 *
 * Budgets (plan section 9):
 *   Main entry chunk:   ≤ 350 KB gzip
 *   Feature/page chunk: ≤ 250 KB gzip each
 *   Vendor chunk:       ≤ 500 KB gzip each (cached by browsers; less critical)
 *   Total initial JS:   ≤ 700 KB gzip (main + vendor combined)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

interface BundleResult {
  file: string;
  rawKB: number;
  gzipKB: number;
  kind: 'main' | 'vendor' | 'feature' | 'other';
}

interface BudgetResult {
  label: string;
  limitKB: number;
  actualKB: number;
  passed: boolean;
}

const BUDGETS = {
  mainChunkKB: 350,
  featureChunkKB: 250,
  vendorChunkKB: 500,
  totalInitialKB: 700,
} as const;

function classifyChunk(filename: string): BundleResult['kind'] {
  if (/^(index|main)-/.test(filename)) return 'main';
  if (/^vendor(-|$)/.test(filename)) return 'vendor';
  if (/^feature-/.test(filename)) return 'feature';
  return 'other';
}

function gzipKB(filePath: string): number {
  const content = readFileSync(filePath);
  return Math.round(gzipSync(content).length / 1024);
}

function analyzeDist(): BundleResult[] {
  const distPath = join(process.cwd(), 'dist', 'assets');

  let files: string[];
  try {
    files = readdirSync(distPath);
  } catch {
    return [];
  }

  return files
    .filter((f) => f.endsWith('.js'))
    .map((file) => {
      const filePath = join(distPath, file);
      const raw = statSync(filePath).size;
      return {
        file,
        rawKB: Math.round(raw / 1024),
        gzipKB: gzipKB(filePath),
        kind: classifyChunk(file),
      };
    })
    .sort((a, b) => b.gzipKB - a.gzipKB);
}

function checkBudgets(chunks: BundleResult[]): BudgetResult[] {
  const results: BudgetResult[] = [];

  const main = chunks.filter((c) => c.kind === 'main');
  const feature = chunks.filter((c) => c.kind === 'feature');
  const vendor = chunks.filter((c) => c.kind === 'vendor');

  for (const chunk of main) {
    results.push({
      label: `Main chunk (${chunk.file})`,
      limitKB: BUDGETS.mainChunkKB,
      actualKB: chunk.gzipKB,
      passed: chunk.gzipKB <= BUDGETS.mainChunkKB,
    });
  }

  for (const chunk of feature) {
    results.push({
      label: `Feature chunk (${chunk.file})`,
      limitKB: BUDGETS.featureChunkKB,
      actualKB: chunk.gzipKB,
      passed: chunk.gzipKB <= BUDGETS.featureChunkKB,
    });
  }

  for (const chunk of vendor) {
    results.push({
      label: `Vendor chunk (${chunk.file})`,
      limitKB: BUDGETS.vendorChunkKB,
      actualKB: chunk.gzipKB,
      passed: chunk.gzipKB <= BUDGETS.vendorChunkKB,
    });
  }

  // Total initial load: entry + all vendor (feature chunks are lazy-loaded)
  const totalInitialKB = [...main, ...vendor].reduce((s, c) => s + c.gzipKB, 0);
  results.push({
    label: 'Total initial load (main + vendor)',
    limitKB: BUDGETS.totalInitialKB,
    actualKB: totalInitialKB,
    passed: totalInitialKB <= BUDGETS.totalInitialKB,
  });

  return results;
}

function run(): void {
  console.log('[bundle-budget] Analyzing bundle sizes (real gzip)...\n');

  const chunks = analyzeDist();

  if (chunks.length === 0) {
    console.error('[bundle-budget] ❌ No JS files found in dist/assets');
    console.error('               Run `pnpm build:client` first');
    process.exit(1);
  }

  console.log('Chunks:');
  for (const c of chunks) {
    const warn = c.gzipKB > BUDGETS.vendorChunkKB ? ' ⚠️' : '';
    console.log(`  ${c.file}: ${c.rawKB}KB raw → ${c.gzipKB}KB gzip [${c.kind}]${warn}`);
  }

  console.log('\nBudget check:');
  const results = checkBudgets(chunks);
  let allPassed = true;

  for (const r of results) {
    const pct = Math.round((r.actualKB / r.limitKB) * 100);
    const status = r.passed ? '✅' : '❌';
    console.log(`  ${status} ${r.label}: ${r.actualKB}KB / ${r.limitKB}KB (${pct}%)`);
    if (!r.passed) allPassed = false;
  }

  console.log('');

  if (allPassed) {
    console.log('[bundle-budget] ✅ All bundle budgets passed');
    process.exit(0);
  } else {
    console.error('[bundle-budget] ❌ Bundle budget exceeded');
    console.error(
      '               Reduce bundle size or update budgets in scripts/check_bundle_budget.ts',
    );
    process.exit(1);
  }
}

run();
