#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

type Requirement = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

function indexOrNeg(haystack: string, needle: string): number {
  const i = haystack.indexOf(needle);
  return i >= 0 ? i : -1;
}

function main() {
  const cwd = process.cwd();
  const deployPath = path.resolve(cwd, 'deploy.sh');
  const goProdPath = path.resolve(cwd, 'scripts/go_prod.ts');
  const productionWorkflowPath = path.resolve(cwd, '.github/workflows/deploy-production.yml');

  if (!fs.existsSync(deployPath)) {
    console.error('[deploy_certify] deploy.sh not found');
    process.exit(1);
  }

  const deploy = fs.readFileSync(deployPath, 'utf8');
  const goProd = fs.existsSync(goProdPath) ? fs.readFileSync(goProdPath, 'utf8') : '';
  const productionWorkflow = fs.existsSync(productionWorkflowPath)
    ? fs.readFileSync(productionWorkflowPath, 'utf8')
    : '';

  const reqs: Requirement[] = [];
  const add = (key: string, label: string, ok: boolean, detail: string) =>
    reqs.push({ key, label, ok, detail });

  add(
    'pg_connectivity',
    'PG connectivity test before migration',
    /CERT_STEP:\s*pg_connectivity_pre_migration/.test(deploy) && /pnpm db:check/.test(deploy),
    'deploy.sh must run db connectivity preflight before migrations',
  );

  const migrateMatches = deploy.match(/pnpm db:migrate:pg/g) ?? [];
  add(
    'migrations_idempotent',
    'Migrations idempotency gate',
    /CERT_STEP:\s*migrations_idempotent/.test(deploy) && migrateMatches.length >= 2,
    `found ${migrateMatches.length} occurrences of "pnpm db:migrate:pg"`,
  );

  add(
    'schema_hash',
    'Schema hash verification',
    /CERT_STEP:\s*schema_hash_verification/.test(deploy) && /schema:hash:check/.test(deploy),
    'schema hash check should run during deploy',
  );

  add(
    'pg_explain_gate',
    'pg_explain.ts plan gate',
    /CERT_STEP:\s*pg_explain_plan_gate/.test(deploy) && /pg_explain\.ts/.test(deploy),
    'deploy should execute pg_explain.ts as a gating step',
  );

  add(
    'extension_check',
    'Extension check (pg_stat_statements)',
    /CERT_STEP:\s*extension_check_pg_stat_statements/.test(deploy) &&
      /pg_stat_statements/.test(deploy),
    'deploy should verify pg_stat_statements extension',
  );

  add(
    'health_smoke',
    'Health endpoint smoke test',
    /CERT_STEP:\s*health_endpoint_smoke_test/.test(deploy) &&
      /\/api\/health/.test(deploy) &&
      /HTTP_STATUS/.test(deploy),
    'deploy should smoke-test /api/health after restart',
  );

  add(
    'rollback_safety',
    'Rollback safety (previous image/build retained)',
    /CERT_STEP:\s*rollback_safety_previous_image_retained/.test(deploy) &&
      /\.rollback_(dist|commit|dist_target)/.test(deploy),
    'deploy should retain previous build artifact/commit',
  );

  add(
    'zero_interruption_reload',
    'Zero-interruption PM2 reload gate',
    /CERT_STEP:\s*zero_interruption_reload/.test(deploy) &&
      /pm2 reload ecosystem\.config\.cjs --only epstein-archive --env production --wait-ready --update-env/.test(
        deploy,
      ) &&
      /exec_mode:\s*'cluster'/.test(
        fs.readFileSync(path.resolve(cwd, 'ecosystem.config.cjs'), 'utf8'),
      ),
    'deploy should readiness-gate PM2 reloads and the app should run in cluster mode',
  );

  add(
    'public_live_data_cutover',
    'Public live-data cutover gate',
    /CERT_STEP:\s*public_live_data_cutover_gate/.test(deploy) &&
      /verify:live-cutover/.test(deploy) &&
      fs.existsSync(path.resolve(cwd, 'scripts/verify_live_cutover.ts')),
    'deploy should verify the public origin live-data contract before declaring success',
  );

  add(
    'staged_artifact_cutover',
    'Staged build before live artifact switch',
    /git worktree add --detach/.test(deploy) &&
      /epstein-archive-canary/.test(deploy) &&
      /mv -Tf \.dist_next dist/.test(deploy),
    'deploy should build/canary in an isolated worktree before atomically switching dist',
  );

  add(
    'remote_deploy_lock',
    'Remote deploy mutex',
    /acquire_remote_deploy_lock\(\)/.test(deploy) &&
      /release_remote_deploy_lock\(\)/.test(deploy) &&
      /\.deploy\.lock/.test(deploy) &&
      /trap cleanup_on_exit EXIT/.test(deploy),
    'deploy should lock the remote checkout across mutation and health-check phases',
  );

  const cleanCommands = deploy.match(/^\s*git clean[^\n]+/gm) ?? [];
  add(
    'remote_deploy_lock_preserved',
    'Remote deploy mutex preserved by git clean',
    cleanCommands.length > 0 && cleanCommands.every((cmd) => cmd.includes('-e .deploy.lock')),
    `found ${cleanCommands.length} git clean command(s)`,
  );

  const dbHealthyIdx = indexOrNeg(deploy, 'CERT_STEP: db_confirmed_healthy_before_restart');
  const restartIdx = indexOrNeg(deploy, 'CERT_STEP: app_restart_after_db_healthy');
  add(
    'restart_order',
    'App restart only AFTER DB confirmed healthy',
    dbHealthyIdx >= 0 && restartIdx > dbHealthyIdx,
    `dbHealthyIdx=${dbHealthyIdx} restartIdx=${restartIdx}`,
  );

  add(
    'fail_fast',
    'Failure aborts deploy immediately',
    /set -euo pipefail/.test(deploy) && /trap 'on_error \$LINENO' ERR/.test(deploy),
    'deploy.sh should fail fast and trap errors',
  );

  add(
    'workflow_db_deploy',
    'Production workflow uses DB-aware deploy',
    /run:\s*\.\/deploy\.sh --with-db --skip-integrity/.test(productionWorkflow),
    'production deploy workflow must invoke deploy.sh --with-db --skip-integrity explicitly after its quality gate',
  );

  add(
    'release_metadata_guard',
    'New version and release notes required for deploy',
    /CERT_STEP:\s*release_metadata_guard/.test(deploy) &&
      /check:release-metadata -- --base/.test(deploy) &&
      /Verify new release version and notes/.test(productionWorkflow) &&
      /check:release-metadata -- --base HEAD\^/.test(productionWorkflow) &&
      /fetch-depth:\s*2/.test(productionWorkflow) &&
      /--skip-integrity requires a clean working tree/.test(deploy) &&
      /--db-only requires a clean working tree/.test(deploy),
    'deploy.sh and production CI must compare version and release notes with the prior commit',
  );

  add(
    'deploy_env_contract',
    'Tracked production deploy env contract',
    fs.existsSync(path.resolve(cwd, '.env.deploy.example')),
    '.env.deploy.example documents non-secret deploy variables while .env.deploy.local stays ignored',
  );

  // Bonus visibility: go_prod.ts includes connectivity + migrations too (not a required target if deploy.sh is certified)
  const goProdSignals = [
    /SELECT version\(\)/.test(goProd),
    /db:migrate:pg/.test(goProd),
    /REFRESH MATERIALIZED VIEW/.test(goProd),
  ].filter(Boolean).length;

  const pass = reqs.filter((r) => r.ok).length;
  const fail = reqs.length - pass;

  console.log('== PHASE 3: DEPLOY SCRIPT CERTIFICATION ==');
  console.log(`target=${path.basename(deployPath)} (go_prod_signals=${goProdSignals})`);
  for (const r of reqs) {
    console.log(`${r.ok ? '[PASS]' : '[FAIL]'} ${r.label}`);
    console.log(`  ${r.detail}`);
  }
  console.log(`\n[SUMMARY] checks=${reqs.length} pass=${pass} fail=${fail}`);

  if (fail > 0) process.exit(1);
}

main();
