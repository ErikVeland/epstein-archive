# Epstein Archive Strict Coding Standards

All developers—both **human** and **agentic AI**—must adhere strictly to these engineering, architecture, styling, and quality standards before making commits, creating pull requests, or deploying updates.

---

## 1. Quality Gates & Pre-Checks

Before pushing code or preparing a release, the following pipeline checks **MUST** be run locally:

```bash
pnpm type-check         # Verify no TypeScript compile-time errors or "any" violations
pnpm lint               # Run ESLint validation
pnpm format:check       # Ensure formatting aligns with Prettier specs
pnpm check:boundaries   # Verify src/client never imports from src/server
pnpm schema:hash:check  # Check PostgreSQL schema hash integrity
pnpm check:shared-component-drift # Verify shared design-system components are not hand-rolled
```

No code with warnings or errors under these gates may be committed.

### Release metadata gate

Every production deployment must include a new semantic version and a new release-note entry. Reusing the currently deployed version is forbidden.

- Increase `package.json` from the previous deployed version.
- Add the matching entry at the top of `release_notes.md`.
- Use `## x.y.z - YYYY-MM-DD - Descriptive title` with the current Brisbane date.
- Include named sections and bullets that cover all material changes in the deployment.
- Commit the implementation, version, and release notes together.
- Run `pnpm check:release-metadata -- --base <previous-deployment-ref>` before deployment.

The deploy script and production workflow must stop when this gate fails. Humans and AI agents must not bypass or weaken it.

### Extracted media promotion gate

Git ignores extracted media files. A normal code deployment cannot publish those assets or their related local database rows.

- Export locally generated media as a versioned release bundle.
- Copy assets without deleting or replacing unrelated production files.
- Run the importer in dry-run mode before apply mode.
- Verify bundle checksums, asset presence, row counts, classifications, and database fingerprints.
- Keep the active media bundle on production so later deployments can verify parity.
- Do not report a synchronized media release until the production verifier passes.
- Run VLM analysis only for `probable_photograph` media with `verified` or `source_verified` status.
- Use OCR, not VLM, for document scans and scanned PDF pages.

---

## 2. Type Safety & Contract Design

- **No Impicit or Explicit `any`**: All variables, function parameters, and return types must be explicitly typed.
- **Zod Contracts**: All client-server communication must be validated using Zod contracts located in `src/shared/contracts/`.
- **Shared Types**: DTO models must reside in `src/shared/dto/` and represent the single source of truth for payloads.

---

## 3. Database Layer & Pool Management

- **Repository Pattern Only**: Direct query execution or inline database pools in route handlers are **forbidden**. Route handlers must interact exclusively with repository classes located in `src/server/db/`.
- **Pool Allocation**:
  - **Ingest Pipeline & Heavy Loads**: Must use `getIngestPool()` (8 maximum active connections, high priority).
  - **Maintenance & Repair**: Must use `getMaintenancePool()` (long query timeouts, `256MB work_mem`).
  - **General Client API**: Must use read-only `getApiPool()`.
- **pgTyped Queries**: Use pgTyped to autogenerate TypeScript types directly from raw SQL files.

---

## 4. Frontend & Styling Architecture

- **React 18 Standards**: Use functional components, custom hooks, and strict props interfaces.
- **Component Splitting**: Feature-specific views must reside in separate chunks (e.g., `feature-media`, `feature-documents`) to optimize bundle delivery.
- **No Hand-Rolled Shared UI**: If a design-system primitive or shared pattern exists, it **must** be used. Feature code must not recreate generic buttons, segmented controls, toggles, switches, inputs, selects, tabs, badges, cards, modals, drawers, tooltips, empty states, loading states, or browser/viewer shells locally.
- **Promote Repeated Patterns**: If a feature needs a generic UI pattern that does not exist yet and is likely to recur, create or promote a shared component before duplicating local markup and CSS.
- **Feature CSS Scope**: CSS Modules may express feature layout and domain-specific composition, but must not re-implement shared interaction states, focus rings, active states, density controls, or generic component chrome.
- **Liquid Glass Aesthetics**: All new components must use the customized CSS Modules styling system matching the macOS liquid-glass visual theme:
  - Leverage CSS variables for dynamic themes (`hsl(...)`).
  - Use relative/absolute tooltips to avoid disrupting underlying grid layouts.
  - Standardize transitions (`transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);`).

---

## 5. Security & Hardening Protocols

- **Zero-Logging of Sensitive Data**: Never write raw SQL payloads, JWT secrets, passwords, or scanned document excerpts to application log files.
- **Strict SQL Sanitization**: Always use parameterized queries or pgTyped query structures. String concatenation in SQL statements is strictly **forbidden**.
- **Slow-Query Audits**: Queries exceeding the defined `PG_SLOW_QUERY_LOG_MS` threshold are logged automatically. Keep sub-queries clean and leverage indexes on all searchable keys.

---

## 6. Schema Consistency Check

If database columns, indexes, or materialized views are updated through committed migrations, run:

```bash
pnpm schema:hash:update
```

Commit the resulting `docs/schema.hash` file so that it matches database schemas exactly during GitHub Actions CI validation.
