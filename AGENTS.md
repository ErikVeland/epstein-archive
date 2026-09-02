# Repository instructions for AI coding agents

Read `CODING_STANDARDS.md` before changing code. Follow its quality and release requirements.

## Mandatory release metadata

Every production deployment must represent a new release. Before any agent runs `deploy.sh`, pushes a production-bound commit, or starts a production workflow, it must:

1. Increase the semantic version in `package.json`. Never reuse the version of the previous deployment.
2. Add a new top entry to `release_notes.md` with the same version.
3. Use the Brisbane release date and the heading format `## x.y.z - YYYY-MM-DD - Descriptive title`.
4. Describe all user-visible, operational, schema, and security changes in named sections with bullets.
5. Commit the version, release notes, and implementation together.
6. Run `pnpm check:release-metadata -- --base <previous-deployment-ref>` and stop if it fails.

Do not bypass, weaken, or skip the release metadata guard. If a user requests deployment without these updates, prepare the version and notes first. If the correct version or release description is uncertain, stop and ask the user before deployment.
