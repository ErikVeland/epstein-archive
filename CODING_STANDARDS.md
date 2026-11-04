# Coding standards

## Required checks

Run these checks before submitting code or preparing a release:

```bash
pnpm precheck
pnpm type-check
pnpm type-check:server
pnpm lint
pnpm format:check
pnpm test:unit
pnpm check:boundaries
pnpm schema:hash:check
pnpm check:shared-component-drift
```

Resolve failures before committing. Do not relax compiler options, checks, or baselines to hide failures.

## Code and architecture

- Use strict TypeScript. Use `unknown` and type guards instead of `any`.
- Keep client code in `src/client`, server code in `src/server`, and browser-safe shared code in `src/shared`.
- Keep shared DTOs and Zod response contracts in `src/shared/dto`, `src/shared/contracts`, and `src/shared/schemas`.
- Validate client-server payloads with shared Zod contracts. Use shared DTOs as the single source of truth.
- Keep database queries in repositories under `src/server/db`. Routes must call repositories.
- Use parameterised SQL or pgTyped queries. Name selected columns explicitly.
- Use `getApiPool()` for API queries, `getIngestPool()` for ingestion, and `getMaintenancePool()` for maintenance.
- Do not log secrets, raw SQL payloads, or document excerpts.
- Keep source evidence, model downloads, generated output, and session artifacts outside Git.

## Frontend

- Use functional React components and shared UI primitives.
- Use CSS Modules and design tokens for styling.
- Reuse generic controls, viewer shells, loading states, and empty states.
- Promote recurring UI patterns into shared components.
- Keep feature CSS focused on layout and domain-specific composition.
- Preserve lazy loading for feature views.
- Keep tooltips from shifting page layout.

## Releases

Every production deployment requires a new semantic version and matching release notes.

1. Increase the version in `package.json` from the previous deployed version.
2. Add a top entry to `release_notes.md` with the same version.
3. Use the Brisbane date and the heading `## x.y.z - YYYY-MM-DD - Descriptive title`.
4. Describe user-visible, operational, schema, and security changes in named sections with bullets.
5. Commit the version, release notes, and implementation together.
6. Run `pnpm check:release-metadata -- --base <previous-deployment-ref>`.

Do not deploy, push a production-bound commit, or start a production workflow if this guard fails.
Never reuse a deployed version or bypass the release guard.

After a schema migration, run `pnpm schema:hash:update` and commit `docs/schema.hash`.

## Extracted media and OCR

A code deployment does not publish local media assets or database rows.

1. Export a versioned media bundle.
2. Copy assets without replacing or deleting unrelated production files.
3. Run the importer in dry-run mode.
4. Apply the import.
5. Run `pnpm media:release:verify` against the active bundle.

Verify checksums, assets, row counts, classifications, and database fingerprints before reporting media parity.
Keep the active bundle on production for later verification.

Run visual analysis only on `probable_photograph` media with a `verified` or `source_verified` status.
Use OCR for document scans and text images. Do not send unknown, missing, or unverified assets to a vision model.

LLM OCR cleanup must preserve raw and canonical evidence text.
Store cleanup as a versioned artifact pending review, with source/output hashes, model identity, and prompt identity.
Reject output that changes numeric tokens or evidence identifiers.
Never let automated cleanup overwrite canonical OCR.

## Pipeline status

- Count only successful work as completed.
- Treat a zero or unavailable target as unknown.
- Report global completion only when every applicable workload has a known target, zero failures, and all work completed.
- Scope live telemetry to the active pipeline run. Keep historical stage rows as audit history.
- Existing entity or graph rows show data availability. They do not prove extraction is complete.
- Keep ingestion, media cataloguing, summaries, normalisation, OCR cleanup, verified-photo analysis, entities, and graph extraction as separate status domains.
