#!/usr/bin/env tsx
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

type Verdict = 'PASS' | 'FAIL';

function runStep(command: string, args: string[]) {
  const res = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    code: res.status ?? 1,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

function observabilityHardeningCheck(): { ok: boolean; details: string[] } {
  const details: string[] = [];
  let ok = true;
  const serverPath = path.resolve(process.cwd(), 'src/server.ts');
  const errPath = path.resolve(process.cwd(), 'src/server/utils/errorHandler.ts');
  const connPath = path.resolve(process.cwd(), 'src/server/db/connection.ts');
  const metaPath = serverPath;

  const server = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, 'utf8') : '';
  const err = fs.existsSync(errPath) ? fs.readFileSync(errPath, 'utf8') : '';
  const conn = fs.existsSync(connPath) ? fs.readFileSync(connPath, 'utf8') : '';
  const meta = fs.existsSync(metaPath) ? fs.readFileSync(metaPath, 'utf8') : '';

  if (/requestIdMiddleware/.test(server) && /app\.use\(requestIdMiddleware\)/.test(server)) {
    details.push('requestId middleware installed');
  } else {
    ok = false;
    details.push('requestId middleware missing');
  }

  if (/pgCode:/.test(err) && /pgQueryName:/.test(err)) {
    details.push('error logs include SQLSTATE/code + queryName');
  } else {
    ok = false;
    details.push('error logs missing SQLSTATE/queryName fields');
  }

  if (/PG_SLOW_QUERY_LOG_MS/.test(conn) && /getSlowQueryLogThresholdMs/.test(conn)) {
    details.push('slow query threshold configurable');
  } else {
    ok = false;
    details.push('slow query threshold not configurable');
  }

  const metaFields = ['pools', 'lastMatViewRefresh', 'version', 'featureFlags'];
  for (const field of metaFields) {
    if (new RegExp(`\\b${field}\\b`).test(meta))
      details.push(`/api/_meta/db field present: ${field}`);
    else {
      ok = false;
      details.push(`/api/_meta/db missing field: ${field}`);
    }
  }

  if (/app\.get\('\/api\/health'/.test(server) && /res\.json\(\{ status: 'ok'/.test(server)) {
    details.push('/api/health is constant-time route by static inspection');
  } else {
    ok = false;
    details.push('/api/health route not found / not simple');
  }

  return { ok, details };
}

function stepVerdict(code: number): Verdict {
  return code === 0 ? 'PASS' : 'FAIL';
}

function parseStress(stdout: string): { plan: Verdict; pool: Verdict } {
  const m = stdout.match(/STRESS_CHECK_SUMMARY_JSON=(\{.*\})/);
  if (!m) return { plan: 'FAIL', pool: 'FAIL' };
  try {
    const obj = JSON.parse(m[1]);
    return {
      plan: obj.planRegressionPass ? 'PASS' : 'FAIL',
      pool: obj.poolSafetyPass ? 'PASS' : 'FAIL',
    };
  } catch {
    return { plan: 'FAIL', pool: 'FAIL' };
  }
}

function printCommandResult(label: string, result: ReturnType<typeof runStep>) {
  console.log(`\n--- ${label} (exit ${result.code}) ---`);
  if (result.stdout.trim()) console.log(result.stdout.trim());
  if (result.stderr.trim()) console.log(result.stderr.trim());
}

function main() {
  const runtimeBlocked = !process.env.DATABASE_URL || !(process.env.API_BASE_URL || '').trim();

  const runTs = (file: string) => runStep('node', ['--import', 'tsx/esm', file]);
  const pgAudit = runTs('scripts/pg_system_audit.ts');
  const ingestAudit = runTs('scripts/ingest_audit.ts');
  const deployCert = runTs('scripts/deploy_certify.ts');
  const stress = runTs('scripts/stress_check.ts');
  const obs = observabilityHardeningCheck();

  printCommandResult('pg_system_audit', pgAudit);
  printCommandResult('ingest_audit', ingestAudit);
  printCommandResult('deploy_certify', deployCert);
  printCommandResult('stress_check', stress);

  const stressSplit = parseStress(stress.stdout);
  const systemIntegrity = stepVerdict(pgAudit.code);
  const ingestionIntegrity = stepVerdict(ingestAudit.code);
  const deploySafety: Verdict = deployCert.code === 0 && obs.ok ? 'PASS' : 'FAIL';
  const planRegression = stressSplit.plan;
  const poolSafety = stressSplit.pool;
  const overall: 'CERTIFIED' | 'BLOCKED' = [
    systemIntegrity,
    ingestionIntegrity,
    deploySafety,
    planRegression,
    poolSafety,
  ].every((v) => v === 'PASS')
    ? 'CERTIFIED'
    : 'BLOCKED';

  console.log('\n--------------------------------------');
  console.log('POSTGRES HARDENING CERTIFICATION');
  console.log('--------------------------------------');
  console.log(`System integrity: ${systemIntegrity}`);
  console.log(`Ingestion integrity: ${ingestionIntegrity}`);
  console.log(`Deploy pipeline safety: ${deploySafety}`);
  console.log(`Plan regression: ${planRegression}`);
  console.log(`Pool safety: ${poolSafety}`);
  console.log(`Overall readiness: ${overall}`);

  if (!obs.ok) {
    console.log('\n[OBSERVABILITY] FAIL');
    obs.details.forEach((d) => console.log(`  ${d}`));
  } else {
    console.log('\n[OBSERVABILITY] PASS');
  }

  if (runtimeBlocked) {
    console.log(
      '\n[NOTE] Runtime prerequisites missing in this session: DATABASE_URL and/or API_BASE_URL not set. Runtime audit phases fail closed by design.',
    );
  }

  if (overall === 'BLOCKED') process.exit(1);
}

main();
