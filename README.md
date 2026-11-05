# Epstein Archive

A research platform for searching the Epstein Files corpus and tracing documents, entities, media, and relationships to their sources.

[Live site](https://epstein.academy)

## Local development

Requirements: Node.js 20.19 or later, pnpm, and PostgreSQL 16 or Docker.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to your local database. The Docker defaults are in `docker-compose.yml`.

```bash
pnpm local:setup
pnpm server
```

In a second terminal:

```bash
pnpm dev
```

Open <http://localhost:3002>. Vite forwards API requests to the server on port 3012.

See [Getting started](GETTING_STARTED.md) for setup, corpus ingestion, and troubleshooting.

## Checks and builds

```bash
pnpm precheck
pnpm type-check
pnpm type-check:server
pnpm lint
pnpm format:check
pnpm test:unit
pnpm build:prod
```

`pnpm check:unused` checks source files and dependencies without a findings baseline. Use `pnpm build:analyze` to generate a bundle report when needed.

Use a migrated PostgreSQL test database for `pnpm test:unit`. This command includes the repository integration tests. Run `pnpm test:integration` to check those repositories separately.

Production builds also require a database for schema and query checks. See [Coding standards](CODING_STANDARDS.md) for release requirements.

## Structure

| Path                  | Contents                                                          |
| --------------------- | ----------------------------------------------------------------- |
| `src/client/`         | React application, CSS Modules, and shared UI components          |
| `src/server/`         | Express routes, repositories, services, and migrations            |
| `src/shared/`         | Browser-safe schemas, DTOs, and utilities                         |
| `packages/db/`        | Typed SQL queries and database package                            |
| `scripts/`            | Ingestion, maintenance, checks, and release tools                 |
| `tests/`, `src/test/` | Browser, contract, unit, and integration tests                    |
| `public/`             | Static application assets                                         |
| `data/`               | Local evidence, models, and generated assets. Not tracked in Git. |
| `docs/`               | Architecture, user guides, and operational runbooks               |

## Documentation

- [Investigation guide](INVESTIGATION_GUIDE.md)
- [Architecture](docs/wiki.md)
- [Evidence and citations](docs/evidence-hypertext-architecture.md)
- [User guide](docs/wiki-user-guide.md)
- [API reference](docs/API.md)
- [Data governance](docs/data-governance-standards.md)
- [Pipeline operations](scripts/README.md)
- [Release acceptance criteria](docs/release-acceptance.md)
- [Release history](release_notes.md)

## Deployment

Copy `.env.deploy.example` to `.env.deploy.local` and configure the connection settings. Runtime secrets remain in the production server's `.env` file.

```bash
./deploy.sh --dry-run
./deploy.sh --with-db
```

Every deployment requires a new version and matching release notes. Extracted media requires a separate verified release bundle.

Run `pnpm backup:pg` to create a PostgreSQL backup. The service keeps the seven most recent completed archives. Set `POSTGRES_BACKUP_DIR` to an absolute shared directory in production so staged builds can verify backup health.

Live API contract checks require `PW_ADMIN_TOKEN` for administrator-only endpoints. Keep the token outside Git and use a short expiry.

## Use

This project is for research and educational use. Source references and review states accompany evidence so researchers can assess its reliability.
