# Evidence Hypertext Architecture

## Product definition

Epstein Archive is a public, evidence-addressable research library for the released Epstein files.
It must let a reader move from any statement to the exact source passage and original scan.

The archive is not a collection of disconnected records. It is a versioned hypertext of sources,
passages, assertions, relationships, events, and research threads.

## Current implementation boundary

The first evidence-grade slice is live in the codebase: passage-first search, append-only v1/v2
citations, exact text and scan addresses, pinned source hashes, citation-aware reading and download,
investigation collation, and a bounded resumable corpus backfill. The assertion graph, public corpus
ledger, generated research threads, and immutable offline casebook exports remain later delivery
slices. This boundary is explicit so the archive does not claim completeness that it cannot yet
prove.

## Governing invariant

Every search result, assertion, relationship, timeline event, summary statement, and casebook item
must resolve to one or more exact evidence passages.

Each evidence passage must resolve to:

1. The immutable source asset.
2. The source release and release occurrence.
3. The document revision used for extraction.
4. The exact page.
5. The quoted text and text offsets.
6. The scan coordinates when available.
7. The OCR confidence and processing lineage.

An exported evidence packet must reproduce the citation without access to the application.

## Evidence chain

```text
Release
  -> Source item
  -> Immutable asset
  -> Document revision
  -> Page
  -> Passage
  -> Citation
  -> Assertion
  -> Correlation
  -> Research thread
  -> Casebook revision
```

Each derived layer keeps a `derived_from` link to the layer below it. A later correction creates a
new revision. It does not rewrite the historical source or silently move an existing citation.

## Epistemic layers

The system keeps these layers separate in storage, APIs, exports, and interface labels.

### Source observation

This layer states what a released record contains. It includes scans, files, raw OCR, corrected
text, metadata, and provenance.

### Structured extraction

This layer contains entities, dates, amounts, locations, events, quotations, and relationship
assertions extracted from source observations.

### Inference

This layer contains correlations, contradictions, possible patterns, research leads, and analyst
interpretations. An inference never becomes a source observation.

## Stable evidence address

The shared evidence address is the central contract for the corpus and application.

```text
citation_id
citation_schema
source_release_id
source_family_id
asset_sha256
document_revision_id
document_sha256
page_id
page_number
passage_id
sentence_index
text_start
text_end
quoted_text
scan_bbox
ocr_confidence
text_sha256
```

The permanent application address has this shape:

```text
/documents/:stableDocumentId?documentId=:stableDocumentId&page=:knownPageNumber&passage=:citationId&viewMode=sidebyside
```

The passage identifier is derived from the release occurrence's stable document ID, document
revision hash, page, passage order, and exact text hash. Duplicate assets remain correlated by asset
hash and source family, but each released occurrence keeps its own resolvable citation. A changed
source or changed transcription produces a new passage identifier.
If a source page is not mapped, `page_number` stays null and the permanent link omits `page`. The
system never substitutes page 1 for an unknown coordinate.

For `evidence-passage-v2`, implementations SHA-256 hash the exact quoted UTF-8 text, then join these
UTF-8 fields with U+001F: schema, `document:<document_id>`, document revision SHA-256,
`page:<number>` or `page:null`, `sentence:<zero-based index>`, and `text:<exact-text SHA-256>`.
The public ID is `EA-P-` plus the first 40 lowercase hexadecimal characters of the resulting
SHA-256. The resolver returns every canonical input so an external client can reproduce the ID.

## Corroboration and duplicates

A document count is not a corroboration count.

The corpus records both:

- Asset identity, based on the file hash.
- Release occurrence, based on the publisher, release, source item, and acquisition event.

Corroboration counts independent source families. It excludes duplicate assets, derivatives, and
repeated copies of the same underlying record.

Every evidence relationship uses one of these explicit roles:

- `supports`
- `contradicts`
- `contextualises`
- `duplicates`
- `quotes`
- `derived_from`
- `same_event`
- `co_mentioned`

Co-mention does not establish a relationship. Association does not establish wrongdoing.

## Application surfaces

### Search Workbench

Search returns evidence passages as its primary result unit. Each result shows the quotation, page,
source release, provenance, OCR quality, text link, scan link, citation action, and case action.
Adding a passage to an investigation stores the full evidence address, exact quotation, hashes,
provenance, text link, and scan link as one grouped evidence item.

All search terms, filters, sort settings, and corpus revision identifiers are stored in the URL.

### Document reader

The reader keeps Clean Text, Raw OCR, Original Scan, and Side by Side modes synchronized to the same
page and passage. Opening a citation highlights the passage in text and on the scan when coordinates
exist.

### Evidence Basis

Every assertion, graph edge, event, and correlation opens the same Evidence Basis view. It lists
supporting, contradicting, contextual, and duplicate evidence. It also shows the derivation rule,
confidence inputs, limitations, and review state.

### Wiki pages

Entities, events, relationships, collections, and research threads have permanent public pages.
Material statements use passage-level footnotes. Claims remain separated by modality, including
documented, quoted, testified, alleged, denied, inferred, and unresolved.

### Corpus ledger

The public corpus ledger reports expected, acquired, hashed, extracted, page-mapped, searchable,
reviewed, duplicate, failed, and missing items for every release. It publishes the denominator,
manifest, corpus revision, change log, and machine-readable exports.

### Research threads

Versioned correlation jobs can surface repeated travel, co-presence, shared identifiers,
communication chains, financial proximity, date conflicts, repeated claims, bridge entities, and
provenance gaps.

A generated thread is a research question. It is not an accusation or conclusion. Each thread keeps
its rule version, inputs, exact citations, counter-evidence, limitations, corpus revision, and review
state. Only reviewed threads can be published.

## Release gates

A feature is evidence-grade only when it passes all applicable gates:

1. Every displayed evidence statement has an exact passage citation.
2. Every passage citation opens the correct text and source scan.
3. Every source file exposes its role, hash, release, and derivative lineage.
4. Every derived result identifies its method, version, inputs, and review state.
5. Every correlation distinguishes co-mention from a supported relationship.
6. Every corroboration result accounts for duplicates and source-family independence.
7. Every exported casebook includes source files, per-file hashes, citations, and corpus revision.
8. Every public completeness claim uses an authoritative release manifest as its denominator.

## Delivery order

1. Repair current provenance, file-variant, export, and evidence-mapping contract gaps.
2. Add stable document revisions, passages, citations, and permanent links.
3. Make search passage-first across all indexed text.
4. Require citation-backed assertions, events, and graph edges.
5. Publish the corpus ledger and machine-readable corpus exports.
6. Populate, review, and publish neutral research threads.
7. Publish immutable casebook revisions with offline-verifiable evidence packets.
