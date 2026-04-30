# Technical Reference Manual

## Repository Standards

This repository utilizes a Node / modern tooling stack designed for maintainability and Type Safety.

### Core Stack

- **Runtime**: Node.js v25.8.2
- **Package Manager**: pnpm
- **Client**: React (Vite bundler)

### Design System: Liquid Glass

We have migrated away from generic Tailwind CSS to enforce strict architectural integrity.

- **Rule**: CSS modules (`.module.css`) must be used for layout uniqueness.
- **Guard**: The script `scripts/check_design_token_usage.ts` intercepts builds if arbitrary utility strings are found in governed elements.

### React Compiler Compatibility

The application logic adheres to rigorous React hooks standards, avoiding unnecessary `useEffect` derivations in favor of render-phase assignments to align seamlessly with modern React compilation strategies.

### Pipeline and CI

- `pnpm type-check`: Strict structural typing checks.
- `pnpm type-check:server`: Strict server-side typing checks using `tsconfig.server.json`; do not weaken this config to ship.
- `pnpm lint`: Formatting and strict TS-Eslint guard rails.
- `pnpm check:design-tokens`: Fails the build if any old Tailwind patterns slip back in.
- `pnpm build:prod`: Runs the server type gate, Postgres guardrails, strict design-token checks, and the production client build.
