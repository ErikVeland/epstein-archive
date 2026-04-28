# Release Readiness Audit (Independent)

Date: 2026-04-27  
Project: **epstein-archive** (Vite + React frontend; Express + Postgres backend; pnpm monorepo with `packages/db`)

## Executive summary

**Verdict: NOT release-ready (P0 blockers present).**

The codebase shows strong _production-minded engineering_ (health endpoints, startup validation, structured logging, rate limiting, load shedding, Sentry integration, and a fairly robust deploy script). However, the current repository state fails key “ship” gates:

- **Build pipeline is blocked by lint/format failures** (and `build:prod` fails because it triggers lint gates).
- **Dependency security posture is not acceptable for release** (pnpm audit reports **45 vulnerabilities: 25 high**).
- **CI quality gate appears misaligned with available scripts**, which can cause CI failures even when the product works.

If you intend to ship publicly and accept untrusted inputs/content, address the P0/P1 items below first.

---

## At-a-glance scorecard

| Area                    |    Status | Notes                                                                                                                          |
| ----------------------- | --------: | ------------------------------------------------------------------------------------------------------------------------------ |
| CI / Quality Gates      |   ❌ Fail | `build:prod` fails due to lint gate; CI runs `scripts/quality_gate.sh` which references scripts not present in `package.json`. |
| Build / Packaging       |   ❌ Fail | `pnpm build:prod` currently fails (lint gate).                                                                                 |
| Unit test health        |   ✅ Pass | `pnpm test:unit` passed (69 tests passed; 16 skipped integration).                                                             |
| Type safety             |   ✅ Pass | `pnpm type-check` passed.                                                                                                      |
| Lint / formatting       |   ❌ Fail | Prettier-related lint errors in multiple files.                                                                                |
| Security / dependencies |   ❌ Fail | `pnpm audit --prod` reports 45 vulns (25 high).                                                                                |
| Runtime robustness      | ✅ Strong | Unhandled rejection/exception handlers; graceful shutdown; load shedding; rate limiting; CSP; startup validation.              |
| Observability           |   ✅ Good | Pino HTTP logging + Sentry (optional) + health endpoints.                                                                      |

---

## Evidence (local checks run)

### 1) Formatting / lint

- `pnpm format:check` → **FAILED** (9 files with prettier issues)
- `pnpm lint` → **FAILED** (38 prettier errors + 1 TS-eslint warning)

This blocks `pnpm build:prod` because the lifecycle `prebuild:prod` runs a “nuclear gates” script that includes lint/typecheck.

### 2) Typecheck

- `pnpm type-check` → **PASSED**

### 3) Unit tests

- `pnpm test:unit` → **PASSED**
  - 20 test files passed, 1 skipped
  - 69 tests passed, 16 skipped

### 4) Production build

- `pnpm build:prod` → **FAILED**
  - Failure cause: lint gate (prettier issues).
  - Additional portability warning seen: `PCRE2 is not available in this build of ripgrep` (suggests at least one gate depends on `rg -P` / PCRE2 support; can break on some environments).

### 5) Dependency security audit

- `pnpm audit --prod` → **FAILED**
  - **45 vulnerabilities found**
  - Severity: **2 low | 18 moderate | 25 high**
  - Examples observed in output:
    - **tar** (< 7.5.7) via `@tensorflow/tfjs-node > tar` (high severity)
    - **dompurify** multiple advisories (moderate/high) requiring upgrade to >= 3.4.0 (or >= 3.3.2 for one advisory)
    - **postcss** (< 8.5.10) XSS advisory
    - **qs** (< 6.14.2) DoS advisory (via express)
    - **nodemailer** (via mailparser) SMTP command injection advisories

---

## Strengths (what looks production-grade already)

### Reliability & safety nets

- **Process-level crash reporting**: `unhandledRejection` + `uncaughtException` handlers (with fatal exit on uncaught exception).
- **Graceful shutdown path**: handles SIGTERM/SIGINT and runs `app.shutdown()`.
- **Load shedding**: `toobusy-js` sheds mutating traffic first.
- **DB saturation shedding**: explicit middleware to return 503 when pool is near exhausted.
- **Rate limiting**: global limiter + route-specific limiters (e.g., auth).
- **Trust proxy**: enables correct client IP handling behind nginx for rate limiting.

### Security posture (good foundations)

- **Helmet with CSP** and reasonable defaults.
- **CORS centrally configured**.
- **Path traversal protection** for file-serving routes with `realpath`-based checks.
- **Auth**:
  - Access token in Authorization header (good; avoids CSRF-by-cookie).
  - Refresh token stored httpOnly and scoped to `/api/auth`, `secure` in production, `sameSite: strict`.
  - In production, missing JWT secrets causes a hard fail (fail-closed).

### Observability

- **Structured logging** via Pino + Pino HTTP with log-level mapping.
- **Sentry integration** (optional) with PII scrubbing.
- **Health endpoints**: `/api/health`, `/api/health/ready`, and deep health checks (table checks, representative query).

### Deployment discipline

- `deploy.sh` includes multiple safety gates: CI gate, DB preflight, schema checks, readiness/deep health checks, rollback logic, and “keep old hashed assets” bridging.
- PM2 config includes backoff + max restarts + memory limits.

---

## Release blockers (P0)

### P0-1: Lint/format failures block build and CI

**Impact:** Cannot produce a releasable production build (`build:prod` fails). CI should fail too.

**Fix:** run and enforce:

- `pnpm format` (prettier --write)
- `pnpm lint:fix` (eslint --fix)
- Ensure pre-commit hooks are working in your dev workflow, not just defined.

### P0-2: Security vulnerabilities (25 high) in production dependency graph

**Impact:** Unacceptable to ship, especially for an app processing untrusted documents, HTML, and uploads.

**Fix (minimum):**

- Upgrade **dompurify** to >= **3.4.0** (multiple advisories).
- Upgrade **postcss** to >= **8.5.10**.
- Resolve **tar** advisory by upgrading the chain under `@tensorflow/tfjs-node` (or replacing/removing that dependency if not essential in production).
- Address `qs` advisory by upgrading express (or forcing a patched `qs` version).

**Recommendation:** Add `pnpm audit --prod` (or `pnpm audit --json` + gating) into CI and treat high severity as a release stop.

### P0-3: CI quality gate script appears inconsistent with `package.json`

`scripts/quality_gate.sh` references:

- `pnpm db:seed:entity1-canary`
- `pnpm test:data-quality`

These are **not present** in the top-level `package.json` scripts (at least in the state audited). If CI runs this script, CI will fail once those lines execute.

**Fix:** Either:

1. Implement those scripts (and ensure they work in CI), **or**
2. Remove/replace them with existing scripts, **or**
3. Guard them behind feature flags and make the default path green.

---

## High priority improvements (P1)

### P1-1: Node version pinning mismatch risk

- `package.json` requires Node `>=20.19.0`
- GitHub Actions uses `20.x` (could resolve to `<20.19.0` depending on runner cache/version)

**Fix:** Pin CI node to `20.19.0` (or higher) explicitly, e.g. `20.19.x` or `22.x` if supported.

### P1-2: Gate script portability (ripgrep PCRE2 dependency)

Build output shows: **“PCRE2 is not available in this build of ripgrep”**.

**Fix:** Avoid `rg -P` / PCRE2-only constructs in quality gate scripts, or ensure CI/dev images install an `rg` build with PCRE2 enabled.

### P1-3: Hard-coded local DB credentials in config/scripts

Examples include `postgresql://epstein:epstein@localhost:5435/epstein_archive` in:

- `packages/db/pgtyped.config.json`
- scripts / tooling

Even if this is “local only”, it normalizes weak defaults and can leak into docs/snippets.

**Fix:** Move to `.env.example` patterns and document “set your own password”; ensure production never uses default creds.

---

## Medium priority improvements (P2)

### P2-1: Tighten deploy-node version check

`deploy.sh` currently checks Node version with `grep -q "v2"` which is overly broad.

**Fix:** enforce `>=20.19.0` explicitly (e.g., parse semver or check `node -p process.versions.node`).

### P2-2: Security headers and caching policy verification

You already set no-store on HTML responses and use Helmet/CSP. Consider validating:

- `/files/*` caching headers (especially for sensitive/PII media).
- `/api/*` cache-control (avoid accidental caching of authenticated data).

### P2-3: Authentication and session lifecycle hardening

- Ensure refresh token rotation is accompanied by cleanup of expired tokens (scheduled job).
- Consider an account lockout policy and audit logging for repeated auth failures.

---

## Recommended release checklist (pragmatic)

### Before tagging a release

1. **Green CI** on main
2. `pnpm format:check` ✅
3. `pnpm lint` ✅
4. `pnpm type-check` ✅
5. `pnpm test:unit` ✅
6. `pnpm build:prod` ✅
7. `pnpm audit --prod` ✅ (no high vulns; documented exceptions if any)
8. Smoke: start prod server locally (`pnpm start`) and hit:
   - `/api/health`
   - `/api/health/ready`
   - `/api/stats/health/deep`

### Post-deploy

1. Validate readiness/deep health checks
2. Verify nginx/static assets route correctly (no 404 on chunked assets)
3. Confirm Sentry is receiving errors (if enabled)
4. Check logs for query-budget warnings and pool saturation warnings
