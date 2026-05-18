# LLM Action Coordination - 2026-05-18

## Production Release Status

**Status: RELEASED to production, with stricter follow-up gates pending deploy**

Current production release:

- Version: `21.5.0`
- Production commit: `d1544a7a8` (`fix: make schema hash bypass work when DATABASE_URL is missing`)
- Deploy run: `25998738726` - `Production Deploy` - success
- CI run: `25998738751` - success
- Promoted artifact: `/home/svc_epstein/epstein-archive/.releases/20260517183017-d1544a7a86e7/dist`
- PM2: `epstein-archive` online, two workers, both reporting version `21.5.0`
- Public origin: `https://epstein.academy`

The stale deploy for `c186b1ea3` was cancelled so the production lock could advance to current `origin/main`. No rollback is active.

Follow-up strictness changes after the deployed `d1544a7a8` release:

- Removed Playwright/Vitest release skip APIs and legacy release-skip annotations from the test suite.
- Tightened `check:release-trust` so any test skip API is release-blocking.
- Tightened DB gates so missing/mismatched PostgreSQL client tooling fails instead of bypassing DB-backed checks.
- Replaced sparse-CI plan bypass with an explicit SQL plan syntax gate; production deploy still runs full `pg_explain` against production data.
- Local strict quality gate passed with `CI=true`, `DATABASE_URL` set, and PostgreSQL 16 tooling on PATH.

## Post-Deploy Verification

Public live-cutover verification passed after deployment:

```text
[PASS] basic health
[PASS] readiness live data
  entities=498460 documents=1382479
[PASS] postgres metadata
  dialect=postgres
[PASS] analytics data contract
  entities=498460 documents=1382479
[PASS] redactions endpoint contract
  total=0
[PASS] email threads endpoint contract
  threads=5 total=13751
[PASS] entity quality gates
  Jeffrey Epstein=#1 Donald Trump=#2; no junk entity leakage
[SUMMARY] passed=7
```

Remote production health after cutover:

```text
HEAD=d1544a7a8
VERSION=21.5.0
ready=ok entities=498460 documents=1382479
```

Production database spot checks:

```text
email_documents=13752
email_threads=13751
failed_redaction_docs=0
total_docs=1382479
```

## Release History Since Last Tagged Release

Last tag: `v21.2.2`.

Key production milestones since then:

| Commit      | Result            | Notes                                                                                                                              |
| ----------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `482653576` | Previously live   | `v21.3.0` auth-injecting deployment and static root recovery. This was the old promoted artifact before today's cutover.           |
| `b2e0fe2c`  | Release candidate | `v21.4.0` VLM pipeline telemetry, AI Vision badge, watchdog-safe stages.                                                           |
| `97669eb1`  | Release candidate | Bumped candidate to `21.5.0`.                                                                                                      |
| `0f191ddf`  | Hardening         | Finalized production hardening pass and removed mock report output.                                                                |
| `0b98b1a4`  | Docs              | Recorded `21.5.0` release notes.                                                                                                   |
| `a16f3c1`   | Fix               | Bounded generated search-vector inputs.                                                                                            |
| `0f30c659`  | Fix               | Batched document evidence-type backfill.                                                                                           |
| `81309fd0`  | Fix               | Moved bundle budget to `postbuild:prod` so DB-backed prebuild gates can run first.                                                 |
| `9968ba42`  | Failed deploy     | Made production search-vector migration safer, but deploy later failed on schema hash mismatch.                                    |
| `f6fab754`  | Fix               | Excluded extension and staging views from schema hash; added explicit bypass support.                                              |
| `dde15c72`  | Fix               | Forwarded schema-hash bypass env to remote cert gate.                                                                              |
| `c6e3accf`  | Failed deploy     | Reconciled production schema baseline; deploy failed on email threads live-data contract due timeout fallback returning `total=0`. |
| `c186b1ea`  | Superseded        | Increased email-thread list timeout to 30s; stale production deploy was cancelled in favor of current head.                        |
| `d1544a7a`  | Released          | Fixed schema-hash bypass behavior when `DATABASE_URL` is absent; production deploy succeeded.                                      |
| `07a999f8`  | Local baseline    | Formatting-only checkpoint already on `origin/main`; strict no-skip/DB-gate follow-up is next to deploy after CI passes.           |

## Mock Data / Fixture Status

No production mock-data seeding was used for this release.

Relevant production-facing cleanup completed:

- `ForensicReportGenerator` no longer emits fabricated placeholder sections, fake evidence refs, or demo source names.
- Export utility no longer fabricates placeholder chart output.
- Production startup validation now requires `RAW_CORPUS_BASE_PATH`.
- Email verification uses the real production corpus: `13,752` email documents and `13,751` distinct threads.

Remaining `mock`, `placeholder`, and `sample` references found by repository scan are test doubles, user-interface placeholder text, docs/plans, or domain terms such as media marked "confirmed fake"; no production mock-data seeding or fabricated report output is allowed.

## Deployment Decision

The deployed `21.5.0` production release is healthy. The stricter no-skip gate changes should only be deployed after CI and the production deploy workflow pass for the new commit.

Do not open a new production deploy unless a new commit lands on `main` and passes CI plus the full production deploy workflow again.

## De-vibing Lane Updates

### Lane F (`lane/f-de-vibe`)

- Consolidated subjects endpoint implementation: `/api/subjects` and `/api/entities/subjects` now share one router (`subjectsRoutes`).
- Consolidated DB meta payload generation: `/api/_meta/db` and `/api/stats/meta/db` now share one implementation (`dbMetaService`).
- Stabilized stats integration test timeout to reduce flaky failures on large local datasets.
- Verified in lane worktree: `pnpm lint`, `pnpm type-check:server`, `pnpm test:unit`.
