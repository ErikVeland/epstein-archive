# 20.0 Agent Planning Pack

## North Star

Version 20.0 is the **Trust at Scale** release. It should make the Epstein Archive feel like a serious investigative operating system: fast to enter, clear about provenance, explicit about uncertainty, rigorous about export integrity, and hard to ship in a broken or unsafe state.

The release is not a feature-sprawl milestone. Every workstream must improve a real user-facing outcome for forensic analysts, journalists, researchers, legal reviewers, or archivists.

## Model Ownership

| Model     | Primary strength                                                | Owns                                                                                            | Must not own                                         |
| --------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Claude    | Product coherence, UX narrative, user empathy, review language  | Product/UX specification, workflow language, empty/error states, review rubrics                 | Code implementation, CI scripts, migrations          |
| GPT/Codex | Repo-aware implementation, TypeScript/React/backend integration | Engineering packets, scoped implementation order, API/type/migration details, integration notes | Product strategy rewrites, independent release gates |
| Gemini    | Large-context verification, consistency review, risk finding    | Cross-surface audits, data integrity, security hardening, CI/CD gates, golden-path coverage     | Feature ownership or UX copy decisions               |

## Parallel Execution Order

1. Claude drafts and maintains `CLAUDE_PRODUCT_UX.md`.
2. GPT/Codex drafts and maintains `GPT_CODEX_IMPLEMENTATION.md`.
3. Gemini drafts and maintains `GEMINI_VERIFICATION_HARDENING.md`.
4. The integrator reconciles shared decisions in `ACCEPTANCE_MATRIX.md`.
5. Implementation starts only after the acceptance matrix has stable pass/fail criteria.

The three model-specific docs can be worked on in parallel because they use different ownership surfaces. Integration happens through this README and the acceptance matrix.

## Shared Rules

- Do not rewrite another model's doc. Propose conflicts in `ACCEPTANCE_MATRIX.md`.
- Keep user trust, provenance, and investigation workflow ahead of novelty.
- Prefer existing design-system primitives, existing API validation patterns, and current Playwright/Vitest structure.
- Treat dependency security, golden paths, production build, and bundle smoke as release-blocking.
- Do not introduce migrations unless existing schema cannot represent the required user-facing state.
- Document unresolved assumptions directly in the owning model doc and mirror release-impacting assumptions in the acceptance matrix.

## Release Workstreams

| Workstream                      | Lead model | Implementation partner | Verification partner |
| ------------------------------- | ---------- | ---------------------- | -------------------- |
| Investigation Command Center    | Claude     | GPT/Codex              | Gemini               |
| Source-First Evidence UX        | Claude     | GPT/Codex              | Gemini               |
| Evidence Packet Builder 2.0     | GPT/Codex  | Claude                 | Gemini               |
| Ambiguity and Review Queue      | Claude     | GPT/Codex              | Gemini               |
| Search Upgrade                  | GPT/Codex  | Claude                 | Gemini               |
| Accessibility and Mobile Polish | Claude     | GPT/Codex              | Gemini               |
| Security Hardening              | Gemini     | GPT/Codex              | Claude               |
| CI/CD Gates                     | Gemini     | GPT/Codex              | Claude               |
| Golden Path Suite               | Gemini     | GPT/Codex              | Claude               |
| Data Governance Audit           | Gemini     | GPT/Codex              | Claude               |

## Definition of Ready

A workstream is ready for implementation when:

- The user-facing outcome is described in the Claude doc.
- The repo-aware implementation packet is described in the GPT/Codex doc.
- Required tests and quality gates are described in the Gemini doc.
- The row in `ACCEPTANCE_MATRIX.md` has a pass/fail release gate.

## Definition of Done

Version 20.0 is releasable when:

- Users can start or resume an investigation from a clear command center.
- Core entity, document, evidence, and claim surfaces expose source, confidence, provenance, and review state.
- Ambiguous or conflicting data is visible and reviewable.
- Evidence packet exports are understandable, deterministic, and verifiable.
- Core flows pass desktop, mobile, keyboard, and degraded-API checks.
- CI blocks format, lint, type, build, bundle, schema, security, and golden-path failures.
