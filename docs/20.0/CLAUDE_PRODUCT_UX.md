# Claude Product and UX Brief

## Mission

Own the human shape of the 20.0 release. Claude is responsible for making the product coherent, trustworthy, and legible for real investigative users. The output should let implementation agents build without inventing product intent.

## Audience

- **Forensic analysts** who correlate dense timelines, documents, flight logs, entities, and communications.
- **Journalists** who need fast source inspection, citation confidence, and exportable evidence packets.
- **Researchers** who need repeatable workflows, saved context, and transparent uncertainty.
- **Legal reviewers** who need provenance, chain of custody, reproducible exports, and careful language.
- **Archivists** who need data governance, source preservation, and metadata completeness.

## User-Facing Success Criteria

Version 20.0 succeeds when:

- A user can start, resume, or triage an investigation from a clear command center.
- Every major entity, document, claim, timeline event, and evidence item exposes source, confidence, provenance, and review state.
- Ambiguity is visible rather than hidden: uncertain aliases, conflicting dates, weak extraction confidence, and unresolved relationships have explicit states.
- Exports are understandable to humans and reproducible by machines.
- Empty states explain whether data is absent, still loading, unavailable, filtered out, or awaiting review.
- Core workflows work on desktop, mobile, and keyboard-only navigation.

## Product Principles

- **Source before assertion**: never present an investigative claim without a way to inspect where it came from.
- **Uncertainty is product data**: low confidence, conflicts, missing metadata, and extraction gaps must be visible.
- **Dense but calm**: preserve information density while reducing cognitive thrash through hierarchy, grouping, and stable controls.
- **Actionable warnings**: every warning must tell the user what is wrong and what they can do next.
- **Export as evidence, not download**: evidence packets should feel like serious review artifacts.

## UX Workstreams

### Investigation Command Center

Define the first screen for active work:

- Active investigations with status, owner, last activity, evidence count, unresolved conflicts, and export readiness.
- Resume actions for the last opened investigation, recently viewed entity, recently viewed document, and current review queue.
- Triage panels for missing provenance, weak confidence, unresolved aliases, failed imports, and export blockers.
- Clear calls to create a new investigation, open review queue, search archive, or generate an evidence packet.

Acceptance criteria:

- A new or returning user knows what to do within one screen.
- Investigation status distinguishes draft, active, review, export-ready, and archived.
- No card reports a raw count without explaining what the count means.

### Source-First Evidence UX

Define consistent evidence metadata language across entity, document, evidence, and claim surfaces:

- Source document or source media.
- Source hash or immutable source identifier.
- Extraction method.
- Confidence level.
- Review state.
- Last verified timestamp when available.
- Link to inspect source context.

Acceptance criteria:

- No core claim appears without visible source affordance.
- Low-confidence or unreviewed items are visually distinguishable without relying only on color.
- Users can jump from summary to exact source context where the data came from.

### Evidence Packet Builder 2.0

Define a guided export experience:

- Packet preview before export.
- Included evidence, omitted evidence, skipped files, unresolved warnings, and checksum preview.
- Human-readable README requirements.
- Machine-readable manifest expectations.
- Export readiness states: ready, warning, blocked.

Acceptance criteria:

- Every export warning is actionable.
- The user can understand what will be included before creating the ZIP.
- Export language avoids overstating certainty.

### Review and Ambiguity Queue

Define the reviewer's workspace for uncertain or conflicting data:

- Alias conflicts.
- Duplicate or near-duplicate entities.
- Conflicting dates.
- Weak extraction confidence.
- Missing provenance.
- Claims needing human review.

Acceptance criteria:

- Each queue item has a recommended action and a safe defer option.
- Review decisions preserve original source text and auditability.
- The queue distinguishes "unresolved" from "false" and "not enough evidence".

### Mobile and Accessibility Polish

Define the minimum viable mobile and accessibility experience:

- Search, entity dossier, document view, investigation evidence list, and export preview must be usable on mobile.
- Primary controls must be keyboard reachable.
- Modal focus must stay contained.
- Button labels, badges, and status text must not clip.
- Status and confidence indicators must not rely only on color.

Acceptance criteria:

- Core flows work at mobile widths without horizontal scrolling.
- A keyboard-only user can complete search, inspect evidence, and open source documents.
- Error, loading, and empty states are announced with meaningful text.

## Copy Standards

- Use precise evidence language: "linked", "extracted", "reviewed", "unreviewed", "conflicting", "source missing".
- Avoid implying legal conclusions unless the data source explicitly supports them.
- Prefer "confidence" for machine extraction certainty and "review state" for human validation.
- Empty states should name the cause: no data, filtered out, not loaded, unavailable, or not reviewed.

## Deliverables

Claude should maintain:

- UX narratives for each workstream.
- Status and empty-state copy.
- Review queue language.
- Export warning language.
- Acceptance criteria for each user-facing workflow.

Claude should not edit implementation files, migrations, CI scripts, or test code.
