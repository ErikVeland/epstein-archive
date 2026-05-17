/**
 * Bundle Budget CI Gate
 *
 * Enforces hard limits on bundle sizes to prevent regression.
 * Run after `pnpm build:client` in CI.
 *
 * Budgets:
 * - Main JS: < 500KB gzip
 * - Vendor: < 300KB gzip (per chunk)
 * - Total initial load: < 1MB gzip
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface BundleResult {
  file: string;
  sizeKB: number;
  gzipSizeKB: number;
}

interface BudgetResult {
  name: string;
  limitKB: number;
  actualKB: number;
  passed: boolean;
}

const BUDGETS = {
  mainChunk: 500, // KB gzip
  vendorChunk: 300, // KB gzip per vendor chunk
  totalInitial: 1000, // KB gzip total
};

function getGzipSize(filePath: string): number {
  try {
    const content = readFileSync(filePath);
    // Simple gzip estimation: compressed is roughly 30-40% of original for JS
    // This is an approximation - real gzip would be more accurate
    const sizeKB = content.length / 1024;
    return Math.round(sizeKB * 0.35); // Estimate gzip as 35% of original
  } catch {
    return 0;
  }
}

function analyzeDist(): BundleResult[] {
  const distPath = join(process.cwd(), 'dist', 'assets');

  try {
    const files = readdirSync(distPath);
    return files
      .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
      .map((file) => {
        const filePath = join(distPath, file);
        const stats = statSync(filePath);
        return {
          file,
          sizeKB: Math.round(stats.size / 1024),
          gzipSizeKB: getGzipSize(filePath),
        };
      })
      .sort((a, b) => b.gzipSizeKB - a.gzipSizeKB);
  } catch {
    return [];
  }
}

function checkBudgets(results: BundleResult[]): BudgetResult[] {
  const budgetResults: BudgetResult[] = [];

  // Check main chunk (typically index-*.js or similar)
  const mainChunk = results.find((r) => r.file.includes('index') && r.file.endsWith('.js'));
  if (mainChunk) {
    budgetResults.push({
      name: 'Main chunk',
      limitKB: BUDGETS.mainChunk,
      actualKB: mainChunk.gzipSizeKB,
      passed: mainChunk.gzipSizeKB <= BUDGETS.mainChunk,
    });
  }

  // Check vendor chunks
  const vendorChunks = results.filter((r) => r.file.includes('vendor') || r.file.includes('chunk'));
  for (const chunk of vendorChunks) {
    budgetResults.push({
      name: `Vendor chunk: ${chunk.file}`,
      limitKB: BUDGETS.vendorChunk,
      actualKB: chunk.gzipSizeKB,
      passed: chunk.gzipSizeKB <= BUDGETS.vendorChunk,
    });
  }

  // Check total initial load
  const initialChunks = results.filter(
    (r) =>
      r.file.includes('index') || r.file.includes('chunk-vendor') || r.file.includes('chunk-main'),
  );
  const totalInitialKB = initialChunks.reduce((sum, r) => sum + r.gzipSizeKB, 0);
  budgetResults.push({
    name: 'Total initial load',
    limitKB: BUDGETS.totalInitial,
    actualKB: totalInitialKB,
    passed: totalInitialKB <= BUDGETS.totalInitial,
  });

  return budgetResults;
}

function runBudgetCheck(): void {
  console.log('🔍 Analyzing bundle sizes...\n');

  const results = analyzeDist();

  if (results.length === 0) {
    console.error('❌ No bundle files found in dist/assets');
    console.error('   Run `pnpm build:client` first');
    process.exit(1);
  }

  console.log('📦 Bundle Analysis:\n');
  for (const result of results.slice(0, 10)) {
    const status = result.gzipSizeKB > BUDGETS.vendorChunk ? '⚠️' : '✅';
    console.log(`   ${status} ${result.file}: ${result.gzipSizeKB}KB gzip`);
  }

  console.log('\n📋 Budget Check:\n');
  const budgetResults = checkBudgets(results);
  let allPassed = true;

  for (const budget of budgetResults) {
    const status = budget.passed ? '✅' : '❌';
    const actual = budget.actualKB;
    const limit = budget.limitKB;
    const pct = Math.round((actual / limit) * 100);

    console.log(`   ${status} ${budget.name}: ${actual}KB / ${limit}KB (${pct}%)`);

    if (!budget.passed) {
      allPassed = false;
    }
  }

  console.log('');

  if (allPassed) {
    console.log('✅ All bundle budgets passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Bundle budget exceeded!\n');
    console.log('   Reduce bundle size or update budgets in: scripts/check_bundle_budget.ts');
    process.exit(1);
  }
}

runBudgetCheck();
