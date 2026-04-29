# 20.0 Acceptance Matrix

## Release Checklist

| Feature/workstream           | User value                                                                                              | Owning model | Implementation owner | Required tests                                                                                       | Release gate                                                                                                    | Status  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ------------ | -------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| Investigation Command Center | Users can start, resume, and triage investigations from one clear workspace.                            | Claude       | GPT/Codex            | Playwright command-center smoke, investigation API contract, mobile viewport check                   | No release if active investigations, empty state, or degraded API state is unclear or broken.                   | Planned |
| Source-First Evidence UX     | Users can verify where entities, documents, claims, and evidence came from.                             | Claude       | GPT/Codex            | Unit coverage for DTO/mappers, Playwright entity/document/evidence source jump, data-integrity audit | No release if core claims can appear without source/provenance/review state or explicit missing-state language. | Planned |
| Evidence Packet Builder 2.0  | Users can preview, understand, export, and verify evidence packets.                                     | GPT/Codex    | GPT/Codex            | Export ZIP tests, manifest determinism tests, Playwright export preview flow                         | No release if export manifest/checksum is unstable or export warnings are not actionable.                       | Planned |
| Ambiguity/Review Queue       | Users can see and resolve uncertainty instead of trusting hidden automation.                            | Claude       | GPT/Codex            | Review queue API tests, Playwright ambiguity review flow, audit log/data preservation checks         | No release if review decisions can erase original source data or ambiguity is collapsed into false certainty.   | Planned |
| Search Upgrade               | Users can find relevant records by source type, confidence, review state, date, entity, and media type. | GPT/Codex    | GPT/Codex            | Search API contract, Playwright search-to-source golden path, query budget tests                     | No release if new filters break existing search callers or create unbounded slow queries.                       | Planned |
| Accessibility/Mobile Polish  | Users can complete core workflows on mobile and with keyboard navigation.                               | Claude       | GPT/Codex            | Mobile Playwright flows, keyboard navigation tests, accessibility scan                               | No release if core search, dossier, document, investigation, or export flows are unusable on mobile/keyboard.   | Planned |
| Security Hardening           | Users and data are protected from unsafe inputs, file access bugs, and dependency risk.                 | Gemini       | GPT/Codex            | Dependency audit, path traversal tests, auth tests, CSP/cache header checks                          | No release with high/critical production dependency vulnerabilities or known unsafe file-serving/export paths.  | Planned |
| CI/CD Gates                  | Broken builds, schema drift, and unsafe releases are stopped before production.                         | Gemini       | GPT/Codex            | CI dry run, schema hash check, production build, bundle smoke                                        | No release if required gates are absent, skipped without documented exception, or red on main.                  | Planned |
| Golden Path Suite            | Real user journeys are protected from route/API/UI regressions.                                         | Gemini       | GPT/Codex            | Playwright golden paths, route/UI sync, API DTO contracts                                            | No release if core journeys fail against release-candidate data. Fixture skips must be documented.              | Planned |
| Data Governance Audit        | Investigative records preserve provenance, original source strings, and reviewability.                  | Gemini       | GPT/Codex            | Data-integrity audit, provenance coverage tests, export manifest verification                        | No release if extracted facts lack source linkage without an explicit missing-provenance state.                 | Planned |

## Shared Pass/Fail Rules

- **Pass** means the feature works in the UI, has API/type coverage where relevant, has at least one user-flow test, and has clear empty/error states.
- **Fail** means the feature can mislead users, hide uncertainty, break export reproducibility, regress core navigation, or bypass release-blocking gates.
- **Exception** means a release manager documents the risk, owner, mitigation, and follow-up issue before release.

## Conflict Resolution

Use this matrix to reconcile model conflicts:

- Product wording conflicts are resolved by Claude unless they affect legal/security guarantees.
- Implementation feasibility conflicts are resolved by GPT/Codex unless they weaken acceptance criteria.
- Gate/security conflicts are resolved by Gemini unless they block a deliberately accepted release exception.
- Any conflict that changes the release promise must update this matrix before implementation continues.
