/**
 * CACHE STAMPEDE PREVENTION TEST
 *
 * Verifies that concurrent cache misses only trigger ONE computation
 */

import { CacheService } from '../src/server/cache/cacheService';

async function testStampedePrevention(): Promise<void> {
  console.log('🧪 Testing Cache Stampede Prevention\n');

  const cache = new CacheService();

  let computeCount = 0;
  const computeFn = async (): Promise<string> => {
    computeCount++;
    console.log(`  Compute #${computeCount} started`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate slow computation
    return `result-${computeCount}`;
  };

  // Simulate 50 concurrent requests on cache miss
  console.log('Simulating 50 concurrent requests on cache miss...\n');

  const promises = Array.from({ length: 50 }, () =>
    cache.getOrCompute('general', 'test-key', computeFn, 60),
  );

  const results = await Promise.all(promises);

  console.log('\n' + '='.repeat(80));
  console.log('Results:');
  console.log(`  Total requests: 50`);
  console.log(`  Compute executions: ${computeCount}`);
  console.log(`  All results identical: ${results.every((r) => r === results[0])}`);
  console.log('='.repeat(80) + '\n');

  if (computeCount === 1) {
    console.log('✅ PASS: Only 1 computation executed (stampede prevented)');
  } else {
    console.log(`❌ FAIL: ${computeCount} computations executed (expected 1)`);
    process.exit(1);
  }

  // Test metrics
  const metrics = cache.getMetricsSnapshot('general');
  const totalReads = metrics.hits + metrics.misses;
  const hitRate = totalReads === 0 ? 0 : metrics.hits / totalReads;
  console.log('\nCache Metrics:');
  console.log(`  Hits: ${metrics.hits}`);
  console.log(`  Misses: ${metrics.misses}`);
  console.log(`  Hit rate: ${(hitRate * 100).toFixed(1)}%`);
  console.log(`  Sets: ${metrics.sets}`);
}

testStampedePrevention().catch(console.error);
