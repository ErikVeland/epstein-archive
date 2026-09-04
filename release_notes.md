# Release Notes

## 22.6.16 - 2026-09-04 - Populated Document Browser and Source Highlights

### Document browsing

- Load the document catalogue without a search, including when a document selection already exists. Avoid applying a score filter when the full range is selected.
- Add a responsive carousel of selected Maxwell interviews, the signed proffer agreement, DOJ oversight records and official correspondence. Resolve each selection against its source collection and filename.
- Keep highlights independent of search and filters, with direct document navigation, swipe support and previous/next controls.

### Reliability

- Return a retryable service error when document listing times out instead of reporting a successful empty archive. Allow up to 15 seconds and expose retry controls.
- Align the default sort with the existing catalogue index to avoid a full-table sort. Keep prepared query names distinct for each sort mode.
- Reuse shared interface primitives and add a shared carousel with reduced-motion support. No database migration or source-file changes.

## 22.6.15 - 2026-09-04 - Native DOJ Corpus Pipeline and Storage Fallback

### Archive access

- Add an official DOJ link to native audio and video players. Missing local streams redirect only to validated DOJ EFTA file URLs.
- Keep native files above 25 MiB in the local archive and use DOJ links on the server. Retain source identifiers, checksums, catalogue entries and available extracted text.

### Processing and provenance

- Add a scoped, resumable native-file worker with hash verification, timestamped transcription chunks and extraction of spreadsheet values and formulas, including hidden worksheets.
- Support an optional Apple-native MLX runtime with pinned local model files and recorded model hashes.
- Preserve original bytes and raw machine transcripts. Track failures, files with no audio and downstream analysis separately. Transcripts remain unreviewed.
- Include older native records that had empty text despite a completed ingestion status.

### Release operations

- Add versioned native media bundles with dry-run import, source-hash document matching and active asset verification. Hard-link staged assets to avoid a second server copy.
- Preserve existing canonical text and reject source, asset and media identity conflicts. This release adds no database migration.

## 22.6.14 - 2026-09-04 - Investigation Workspace and Mobile Workflows

### Investigation workflow

- Restore the investigation workspace updates, including case navigation, evidence collection, board views, hypothesis review and team management.
- Simplify first-run guidance around searching the archive, checking original sources and building a case.
- Retain lazy-loaded analytical panels and repair the merge conflict that broke the workspace layout.

### Mobile and presentation

- Update mobile investigation navigation, the board layout and the additional-tools drawer.
- Refine the add-to-investigation interaction and media viewer styling.
- Include optimised logo and social-preview assets.

### Access, data and operations

- Require the investigator role for the updated investigation write routes and align client access handling.
- Carry investigation scope through creation queries, generated query types and shared contracts. These query changes do not add a database migration.
- Add rate-limited, validated investigation workflow telemetry and browser regression coverage for access and mobile navigation.
- Include the evidence-review, dependency and deployment-security changes documented in 22.6.13. This release does not claim a new enriched-data export or production asset synchronisation.

## 22.6.13 - 2026-09-04 - Evidence Review and Security Release

### Evidence review

- Publish the property listings, Black Book identity review, player timeline, source-led analytics and financial review described in releases 22.6.6 through 22.6.12.
- Include the consistent redacted logo and stable FAQ carousel height.

### Security and operations

- Update archive extraction, image processing, routing, HTML sanitisation and compatible dependencies to patched releases.
- Separate the SSH administrator from the deployment runtime account. Require verified SSH host keys and retain runtime privilege restrictions.
- Pause automatic production deployment while revoked CI credentials are replaced. Manual workflow dispatch requires a pinned host key; local deployment retains CI and release gates.
- Keep original evidence and AI review boundaries intact. Host cleanup does not establish that the compromised host is clean.

### Database

- Include the versioned property-media relationship table and reviewed-identity lookup index, with their matching schema baseline.
- Restore the subject property's historic address only for the exact source-verified parcel match.

## 22.6.12 - 2026-09-04 - Source-led Financial Review

### Financial evidence

- Replace speculative flow and pattern displays with chronological, searchable financial records and direct source-document links.
- Expose stored provenance and payment methods in list and detail responses. Do not substitute wire transfers or USD when those fields are missing.
- Keep stated amounts separate by currency and label sums as extracted mentions, not verified transfers or net flow.
- Add source-link and unknown-party review queues, currency filters, scoped JSON exports, and explicit loading, empty, and error states.
- Remove silent snapshot substitution and fixed-confidence laundering claims. Explain extraction limits, duplicate mentions, and incomplete source dates.

### Browsing and API

- Add bounded offset pagination with a stable date-and-ID order. Load older records in batches and render additional cards on demand.
- Use the authenticated API client and validate financial responses against a shared contract.
- Sign guest financial reads and reuse signature verification only within the same request. Retain replay rejection across separate requests.
- Preserve investigation-specific scope without falling back to unrelated archive records.

### Verification

- Add tests for provenance mapping, currency isolation, missing information, and invalid payload handling.
- This release changes presentation and read APIs. It does not verify financial allegations or modify extracted evidence.

## 22.6.11 - 2026-09-04 - Stable FAQ Carousel Height

### About page

- Reserve the tallest FAQ slide's height at the current screen width so automatic and manual slide changes do not move the footer.
- Keep full answers readable on narrow screens and at larger text sizes without a fixed pixel-height crop.
- Hide inactive slides from assistive technology and label the slide-selection buttons.

## 22.6.10 - 2026-09-04 - Consistent Redacted Wordmark

### Logo presentation

- Remove the home-link underline in resting, hovered, focused, active, and visited logo states on desktop and mobile.
- Use the same lettering for the resting wordmark and alternate-title reveals. Preserve character widths under redaction bars instead of switching between plain text and fixed-width letters.
- Retain the existing redaction and alternate-title sequence. Keep a stable accessible name while visual letters animate.

## 22.6.9 - 2026-09-04 - Evidence-first Analytics

### Investigation workflow

- Replace the oversized default graph and duplicate charts with People & evidence, Archive coverage, and Places views.
- Prioritize canonical VIP and reviewed people. Exclude junk and quarantined identities, show missing document links, and open profiles without depending on the current global search slice.
- Separate distinct linked documents, stored mentions, and relationship records. Inspect shared source documents for individual peer connections; relationships alone do not establish contact or wrongdoing.

### Honest coverage and readable displays

- Remove the misleading classification-equals-integrity badge and speculative gaps in the date chart. Classification does not establish ingestion or enrichment completion.
- Show exact counts and selectable logarithmic or linear bars for unequal populations. Explain date fallback and flag differences between live and cached totals.
- Keep loading, failed requests, empty results, and missing counts distinct. Add bounded node sizing to the shared network renderer.

### Maps and operational scope

- Replace the key-gated CARTO basemap with attributed OpenStreetMap tiles. Label airport fallback points, provide working record links and a location list, and report tile failures.
- Add cached, typed read-only people and peer endpoints. No evidence, entity identities, or database schema are rewritten by this release.
- Load investigation financial and forensic tools on demand to retain the existing bundle-size limit after removing the old analytics charts.

## 22.6.8 - 2026-09-04 - Timeline Player Paths

### Visual exploration

- Add an alternate Player paths view beside the existing chronology, with coloured lanes and selectable year nodes.
- Toggle individual people and organisations, filter by decade and event type, or isolate events shared by selected names. Existing significance filters apply to both views.
- Keep names visible while the map scrolls horizontally. The record inspector moves below the map on smaller screens.

### Evidence boundaries

- Draw shared-event links only when the same timeline record explicitly lists both names. Do not infer contact, causation, or wrongdoing from a link.
- Keep unresolved names separate from linked entity identities. Open linked profiles and existing event source details directly.
- Label missing direct sources and unnamed records. Equal-width year columns are an exploration aid, not an elapsed-time scale.
- Reuse the current timeline feed without changing evidence, enrichment data, or database schema. This view does not independently verify existing timeline entries.

### Verification

- Add regression checks for duplicate names, unresolved identities, shared-event filtering, chronological order, invalid dates, and empty selections.

## 22.6.7 - 2026-09-04 - Black Book Source Integrity and Identity Review

### Original evidence

- **The default Black Book view now isolates original-book records.** Contacts extracted from other documents are a separate collection, not evidence of inclusion in the book.
- **Raw OCR is preserved in API responses.** Silent spelling substitutions are removed. Reading names and candidate identities remain separate from source transcription.
- **Filters no longer hide entries without phone numbers by default.** The original collection is filtered before the display limit, including canonical-name search.
- **Source coverage is explicit.** The original PDF opens directly. A reproducible, read-only audit records one strict page match, pinned to the source entry hash and PDF checksum. Unmapped pages remain unresolved.

### Identity and portrait context

- **Complete names are compared with VIP and reviewed entities.** Exact name matches and possible OCR matches have separate labels. Household entries, initials, surname-only fragments, and ambiguous matches do not acquire an automatic identity.
- **Reference portraits have source credits.** Three public-domain portraits are available for complete-name matches. They identify candidate profiles and are not represented as Black Book evidence.
- **Unassigned group-photo faces are no longer used as portraits.** Archive face crops require the same assigned entity and verified, non-sensitive source media.
- **The viewer no longer renders dead profile buttons.** Unresolved entries offer evidence search instead. Review leads can be filtered and opened as candidate profiles.

### Review limits and verification

- **The identity lookup has a targeted index and short-lived cache.** Reviewing the book no longer requires a full scan of the entity table on first load.
- **This release does not claim 100% transcription or identity verification.** The current local audit contains 1,077 original fragments, 19 complete-name matches, three possible matches, and one ambiguous match. These are review aids, not adjudicated identities.
- **Regression tests protect the matching boundary.** Checks cover complete names, OCR candidates, household fragments, ambiguous identities, and raw-text preservation.

## 22.6.6 - 2026-09-04 - Property Evidence Listings

### Real-estate catalogue

- **Property records now read as housing listings.** Each card leads with verified imagery when available, assessed value, address or parcel identity, owner of record, bedrooms, bathrooms, living area, acreage, year built, and property type.
- **Investigation relevance is the default order.** The confirmed subject parcel appears first, followed by records with verified archive media and entity-linked owners. Users can still sort by assessment, owner, or year built.
- **Search now covers the full record.** Owner names, addresses, street names, and parcel control numbers are searchable from one field.
- **Every record links to its official source.** Parcel cards and dossiers open the corresponding Palm Beach County Property Appraiser record in a separate tab.

### Evidence-safe photography and labels

- **Property photography now has an auditable relationship layer.** Each link stores the archive media item, match basis, confidence, and primary-image status. No image is attached until its specific parcel match is verified.
- **Unmatched records do not receive decorative stock images.** They show an intentional evidence placeholder until a verified property photograph is linked.
- **The subject parcel has its evidence-verified historic address.** The exact parcel record restores 358 El Brillo Way without relying on owner-name inference.
- **Loose surname matches no longer claim ownership by Jeffrey Epstein.** They appear as review-only owner-name matches. Existing entity relationships appear as “Entity-linked owner,” with a clear warning that the link is a review aid and not proof of identity or wrongdoing.
- **Assessment language is precise.** The interface no longer presents tax-roll values as listing prices.

### Investigator dossier

- **Property details combine public-record and archive context.** The side dossier includes the source parcel, map, verified-image description, structural data, valuations, entity profile, and investigation action.
- **Photo provenance remains visible.** Verified archive images retain their media identifier and relationship metadata through the property API.

## 22.6.5 - 2026-09-04 - Flight Evidence Board

### Evidence-first departures board

- **Flights now open in evidence-interest order.** Source annotations, key archive people, relevant island routes, international legs, manifest size, and alternate aircraft contribute to a transparent review score.
- **Each flight explains why it was surfaced.** Compact reason labels distinguish source notes, route context, notable manifests, and other useful signals without implying guilt or knowledge.
- **The complete manifest remains available.** Users can switch to latest, earliest, or largest-manifest order and continue to filter by passenger and date.

### Clearer flight information

- **The timeline now reads like an aviation status board.** Tail number, date, route, manifest, and review status have a consistent hierarchy.
- **Aircraft icons are visible again.** Fixed dimensions and a dedicated route marker prevent the SVG from collapsing between the route lines.
- **All 110 flight records load into the board.** The client retrieves both API pages instead of silently omitting the final ten records.
- **The evidence boundary is explicit.** Interest scores guide review; a manifest entry does not prove participation, knowledge, or wrongdoing.

### Verification

- **Unit tests protect the interest model.** Tests cover source annotations, key-person context, USVI and international routing, and ordinary baseline records.

## 22.6.4 - 2026-09-04 - Key Correspondence Narrative

### Curated email archive

- **The email browser now opens on Key correspondence.** This collection removes bulk mail, empty records, generic subjects, invalid dates, and implausible thread merges from the main reading path.
- **Related replies are reconstructed into threads.** The archive groups dated messages by normalized subjects when the source did not preserve a thread identifier.
- **Curation requires evidence context.** Each thread contains multiple substantive messages and links at least two people from the archive's key-person index.
- **The complete mailbox remains available.** Full archive and Promotions views retain the unabridged records and existing filters.

### Timeline narrative

- **Curated threads follow their original message dates.** The API now prefers the preserved email date instead of the database ingestion timestamp for lists, filters, and message order.
- **The timeline groups correspondence into clear periods.** Each card shows its date range, message count, subject, header participants, linked people, source preview, and attachment status.
- **The interface states the evidence limit.** Machine curation creates a reading path. A link or mention does not establish participation, knowledge, or wrongdoing.

### Performance and verification

- **Thread counts and list pages load concurrently.** The curated landing view avoids a second sequential archive scan.
- **Server tests protect the curation boundary.** Tests cover thread reconstruction, key-person requirements, bulk-mail suppression, chronology, and consistent detail filtering.

## 22.6.3 - 2026-09-04 - Media Browser First Paint and Interest Ranking

### Faster first paint

- **The image browser now shows a responsive card skeleton while its first page loads.** The content area no longer appears empty while the API and thumbnails are pending.
- **Visible thumbnails start immediately.** The initial grid and list rows bypass deferred intersection loading, while later images remain lazy loaded to protect bandwidth and scrolling performance.
- **Restored scroll positions are limited to loaded rows.** A saved offset can no longer place the virtualized browser beyond page one and leave the viewport blank until the user scrolls.

### Evidence-backed discovery

- **Media interest is the default image order.** The ranking combines curator rating, linked people, completed visual analysis, source verification, photographic classification, and descriptive context.
- **The ranking remains transparent and optional.** Media interest appears in the sort control, and users can still sort by added date, capture date, name, or file size.
- **The main view still excludes scans and low-information graphics by default.** Interest ranking applies to the browseable visual corpus instead of promoting text-only PDF pages.

### Verification

- **Repository tests protect the interest-order contract.** The checks verify each evidence signal and the deterministic newest-first tie breaker.

## 22.6.2 - 2026-09-04 - Pipeline Fairness and Restart

### Continuous processing

- **Production deploys now start or restart the unified evidence pipeline after the application passes its readiness gate.** New pipeline stages no longer require a separate manual PM2 start after release.
- **Redaction analysis yields to the rest of the enrichment pipeline.** Each cycle processes at most 5,000 resumable redaction documents before summaries, OCR cleanup, media, graph, and analytics stages get their turn.
- **The background worker definition is saved after deployment.** PM2 can restore the bounded pipeline after a host restart.

## 22.6.1 - 2026-09-04 - Portable Pipeline Runtime

### Deployment reliability

- **The evidence pipeline can now install its pinned PDF runtime without administrator access.** Deployment uses the standard virtual-environment path when available and a verified manylinux wheel fallback when the production host does not provide `ensurepip` or `python3-venv`.
- **The fallback package is integrity checked before extraction.** Its fixed version, platform, download URL, and SHA-256 digest are recorded in the bootstrap code; unsupported hosts fail closed.
- **Redaction scanning still uses an isolated project interpreter.** The application does not alter system Python packages.

## 22.6.0 - 2026-09-04 - Redaction Intelligence

### Evidence recovery

- **The archive now detects false PDF redactions without altering source files.** The scanner reports machine-readable text only when a later opaque drawing object covers it. Every finding retains its page, bounds, source hash, method, and confidence.
- **Original PDFs remain byte-for-byte unchanged.** The forensic output is a findings sidecar and an identical working copy. The pipeline no longer deletes drawings, images, or annotations from evidence.

### Contextual hypotheses

- **EXO can rank possible names and identifiers from a closed evidence set.** Candidates must already occur in the document, its entity links, or visible identifiers. The model cannot add an unsupported identity.
- **Protected identity categories are excluded from candidate generation.** Survivor, victim, and minor entity records cannot become contextual unredaction suggestions.
- **Low-fit candidates remain unresolved.** The pipeline requires at least 55% contextual confidence before it stores a hypothesis and caps machine confidence at 95%.
- **Each hypothesis is reviewable.** The archive stores the model, prompt version, rationale, corroborating-document count, confidence, and review state separately from canonical evidence.
- **Confidence is not presented as truth.** The Redaction Intelligence page states that confidence measures contextual fit and does not establish identity, accuracy, guilt, or truth.

### Review experience

- **The Redactions page separates structural recoveries, contextual hypotheses, and unresolved gaps.** It links each finding back to the original document and page.
- **Empty legacy attempts no longer fill the review queue.** The queue now contains only documents with stored, auditable findings.
- **The FAQ explains the new trust boundary.** It distinguishes readable text beneath a PDF overlay from an inferred candidate and confirms that original files remain unchanged.

### Pipeline and verification

- **Redaction intelligence is a registered pipeline stage.** A resumable scan ledger prevents repeated work and supports bounded parallel PDF analysis.
- **The deploy process installs the required isolated Python dependency when needed.** The scanner fails fast when PyMuPDF is unavailable.
- **Validated shared contracts protect the API boundary.** Summary, queue, and document-finding responses reject malformed confidence or provenance data.

## 22.5.4 - 2026-09-03 - Search Highlight Isolation

### Navigation repair

- **Document highlights now belong to the current URL.** Searches entered in the Document Browser are reflected in the route, so document views and Back navigation retain intentional search context without relying on hidden application state.
- **Casual browsing clears machine-generated search context.** Opening a document collection or screen without an explicit `search` or `q` parameter removes inherited terms and stale highlights.
- **Legacy global searches no longer survive reloads.** The application removes the old `navigationSearchTerm` value instead of persisting it across unrelated screens and sessions.

### Verification

- **Navigation checks cover route-scoped search behavior.** Lint, TypeScript, unit, production-build, and browser checks verify that explicit searches remain usable and unsearched routes render without inherited highlights.

## 22.5.3 - 2026-09-03 - About Action Styling Repair

### Interface repair

- **The About-page View action now uses the active design token.** Its border, tinted background, hover treatment, and focus outline no longer depend on an undefined CSS variable, so browsers render the intended button hierarchy on desktop and mobile.

### Verification

- **Production visual inspection now includes computed action styles.** The release check confirms that View renders as a sized flex control with a visible border and surface treatment.

## 22.5.2 - 2026-09-03 - Archive Navigation and Original Downloads

### Source navigation

- **About-page source actions now apply exact collection filters.** A source name no longer becomes a full-text query. The Document Browser opens the complete selected tranche, including its archived media records, and keeps the source filter in the URL.
- **Every referenced tranche is directly linked.** Source titles, View actions, and the corpus descriptions lead to the relevant collection, Black Book, or media browser.
- **Named archive subjects link to their profiles.** The About page resolves canonical Jeffrey Epstein and Ghislaine Maxwell records and links mentions to their evidence profiles.

### Archive downloads

- **Original-document downloads use one canonical client path.** Document modals, global search, evidence pages, file browsing, and text, email, and image viewers now request the preserved original variant consistently.
- **The server enforces downloads as attachments.** Local files, pinned evidence assets, remote source fallbacks, and generated email originals return a safe filename and an explicit attachment disposition when requested.
- **The About-page source downloads no longer point to missing routes.** The Black Book and flight-log controls serve the preserved PDFs, and non-functional disabled download icons have been removed.
- **Legacy PDF downloads now request attachment delivery.** The media PDF endpoint preserves inline viewing while returning an attachment with the source filename for download actions.
- **Verified files remain accessible from isolated deployment worktrees.** File serving permits the already root-validated corpus path even when a parent staging directory begins with a dot.

### Interface repair

- **The About-page View action has a complete button style.** Mobile and desktop controls now have consistent sizing, contrast, hover, and keyboard-focus states.

### Verification

- **Route tests cover exact source filtering and attachment delivery.** URL tests also protect original-variant, encoded-document-ID, and SHA-256-pinned download contracts.

## 22.5.1 - 2026-09-03 - Truthful Pipeline Progress

### Status accuracy

- **Completion now means successful coverage of every applicable workload.** Failed work is excluded from completed counts, an unknown or zero target is not displayed as 100%, and AI completion includes summaries, deterministic normalization, safe OCR cleanup, and verified-photograph VLM analysis.
- **Entity and graph records are reported as available, not falsely complete.** Existing rows no longer stand in for an authoritative workload target.
- **Stage telemetry is scoped to the active pipeline run.** Historical successes and failures remain audit history without contaminating the live status.
- **AI artifact review totals use explicit accepted states.** Pending and unreviewed model output is not counted as human-reviewed evidence.

### Throughput and reliability

- **Repeated pipeline status requests are coalesced for 15 seconds.** The About page also polls at that cadence, preventing open dashboards from launching overlapping archive-wide count queries while ingestion is active.
- **Live VLM and OCR counters use a lightweight 30-second cache.** The desktop observer no longer runs the verified-photo catalog scan every five seconds, while active-run status stays current.
- **Status checkpoint writes are atomic.** Readers no longer see partial JSON while a worker publishes progress.
- **Verified-photo VLM batches are larger and have no fixed per-image delay.** Strict photograph verification, bounded image inputs, and evidence-safe routing remain unchanged.

### Agent guardrails

- **Repository instructions now define pipeline-completion integrity.** Agents must keep workload domains separate, treat missing denominators as unknown, exclude failures, and never infer completion from the existence of output rows.

## 22.5.0 - 2026-09-03 - Evidence Enrichment and Accountability

### Enriched evidence corpus

- **The About page now reports the live archive instead of obsolete release-day claims.** It distinguishes source records, structured metadata, evidence mentions, candidate entities, connection signals, curated visual evidence, and AI artifacts.
- **Researchers can see what enrichment adds.** Source-positioned mentions, cross-document signals, verified visual evidence, summaries, and safe OCR cleanup are described with their provenance and review limits.
- **The archive states its present data-quality limits.** Candidate entities can include OCR fragments and unresolved aliases, connection signals are leads rather than findings, collection counts can change during ingestion, and official redactions remain intact.

### Accountability and legal context

- **The release replaces unsupported named-person rankings with defensible lines of inquiry.** Researchers are directed toward corroborated timelines, operational pathways, institutional interfaces, and contradictions that can be checked against source records.
- **Potential legal avenues are described without declaring guilt.** The About and FAQ pages explain how trafficking, conspiracy, obstruction, evidence tampering, perjury, false statements, financial facilitation, and civil claims depend on admissible evidence, jurisdiction, and the elements of each claim.
- **Legal references now link to primary sources.** The public guidance links to the governing federal statutes and the Justice Department's professional-responsibility findings on the 2006–2008 federal resolution.
- **Victims and survivors remain central.** The archive explains why public accountability must preserve official redactions, avoid identifying or harassing survivors, and never turn an algorithmic score into an accusation.

### About and FAQ experience

- **The About page explains the archive in plain language.** It separates source evidence from machine interpretation and explains what a mention, relationship, visual classification, and AI artifact can and cannot establish.
- **The FAQ now answers eighteen practical and ethical questions.** New guidance covers changing totals, DOJ datasets, graph connections, identity ambiguity, AI limits, safe OCR cleanup, media filtering, possible cases, limitations periods, charging barriers, verification, downloads, and reporting unsafe output.
- **Old hard-coded discovery claims are removed.** Public statistics now come from live APIs, and collection redaction labels are identified as estimates rather than recovered hidden text.

### Pipeline and release integrity

- **Safe enrichment remains additive and reviewable.** EXO OCR cleanup and other AI outputs stay separate from raw and canonical evidence, retain model and source metadata, and never establish criminal responsibility.
- **Visual processing remains restricted to verified photographs.** Scanned pages stay out of the default media view and use OCR rather than VLM analysis.
- **This release records scope honestly.** It publishes the application and public interpretation layer over the already promoted media catalog; ongoing local AI artifacts are not described as production evidence until a separate, verified data promotion completes.

## 22.3.9 - 2026-09-03 - OCR Duplicate Single-Flight

### EXO throughput

- **Concurrent duplicate documents now share one cleanup request.** An in-flight source-hash lock prevents identical OCR records in the same batch from occupying both text models with duplicate work.
- **Persistent and in-memory reuse remain validated.** Reused output must pass the full preservation gate against the current source before the worker stores a separate provenance-linked artifact for that document.

## 22.3.8 - 2026-09-03 - OCR Uncertainty Preservation

### Safe partial cleanup

- **A rejected chunk now falls back to its exact source OCR.** One uncertain section no longer rejects an otherwise safe document or causes repeated EXO work.
- **Artifacts record unchanged sections.** Provenance now includes the number of chunks preserved verbatim and every EXO text model attempted, while the assembled document still passes the complete preservation gate before storage.

## 22.3.7 - 2026-09-03 - Safe AI OCR Cleanup

### Forensic OCR integrity

- **OCR cleanup now preserves raw evidence.** EXO-generated cleanup is stored as a separate, pending-review artifact and never overwrites canonical OCR text.
- **Every output must pass deterministic preservation checks.** The pipeline rejects changed numeric tokens, removed or invented evidence identifiers, excessive deletion or expansion, low source-word retention, excessive novel wording, and model preambles.
- **Long documents are processed in full.** Bounded chunks cover the complete source text instead of silently limiting cleanup to the first five chunks.
- **Artifact writes are atomic and auditable.** Each accepted result records input and output hashes, exact model IDs, prompt and artifact versions, chunk count, validation measurements, source lineage, and review requirements.

### Queue and model routing

- **Only OCR-backed documents enter the cleanup queue.** Eligibility comes from page-level OCR provenance or the permanent legacy-reset marker; ordinary digital text and image assets are excluded.
- **Only callable EXO text models receive OCR cleanup work.** Vision models remain dedicated to verified photographs, and one document worker is assigned per available text model.
- **Queue discovery uses indexed provenance candidates.** The worker avoids decompressing the full document corpus before inference begins, and exact duplicate OCR sources reuse an already validated artifact.
- **The unsafe v1 execution paths are disabled.** Ingest and enrichment can no longer invoke the legacy truncating cleanup or enable canonical AI text rewrites.

### Legacy repair and progress accuracy

- **Unverifiable legacy cleanup is removed and requeued.** The data migration restores affected refined text from immutable raw OCR, clears stale derived hashes and legacy flags, removes v1 artifacts, and marks each affected document for v2 processing.
- **The pipeline dashboard reports the real v2 workload.** AI OCR progress uses eligible OCR documents as its stable denominator and accepted v2 artifacts as its numerator instead of the former equals-sign heuristic.

## 22.3.6 - 2026-09-03 - Summary Completion Edge Case

### Pipeline correctness

- **Documents with null metadata now enter the pending-summary queue correctly.** The queue predicate no longer lets SQL null semantics skip an otherwise eligible document, allowing summary progress to reach an exact 100%.

## 22.3.5 - 2026-09-03 - AI Pipeline Throughput and Metrics

### Pipeline throughput

- **Summary workers now use all callable text-model instances concurrently.** Vision models remain reserved for verified photographs, and concurrency never exceeds live text-model capacity.
- **Image documents no longer enter the document-summary queue.** Scans remain available through OCR, while verified photographs use the media VLM path instead of generating summaries from legacy synthetic visual text.
- **Summary queue reads now use primary-key pagination.** This removes the repeated full-corpus sort that took tens of seconds for every three-document batch.
- **Long inference calls keep the pipeline heartbeat current.** Valid model work no longer triggers a false stalled-worker restart.
- **Larger database fetches feed many inference batches.** The pipeline spends less time finding pending documents and more time generating summaries.
- **Photograph analysis now uses bounded 1,600-pixel inputs and concise visual-search output.** This reduces transfer, vision-token, and generation overhead while retaining useful scene, visible-text, and search-term context.
- **VLM requests publish a keepalive heartbeat.** A long photograph inference cannot be mistaken for a stalled worker.
- **Email-header backfill is now idempotent and keyset-paginated.** Unparseable messages are recorded once instead of consuming up to 20,000 repeated attempts on every pipeline cycle.
- **Verified-photograph analysis now runs before secondary metadata backfills.** Available vision capacity starts reducing the visible VLM queue as soon as text summaries are complete.

### Progress accuracy

- **Decoded and normalized progress uses both refined text and verified normalized-text hashes.** The dashboard no longer reports completed deterministic normalization as pending work.
- **VLM progress counts only eligible verified photographs.** Historical document VLM flags no longer appear as current visual-analysis progress.
- **Widget cache refreshes use one database worker.** Long archive scans cannot create overlapping refresh queries every five seconds.

## 22.3.4 - 2026-09-03 - Optimized Media and VLM Controls

### Production media storage

- **Production receives the optimized image variants.** The media release replaces 17,185 catalogued image files with their smaller local variants and updates the active asset-size manifest.
- **The optimized catalog saves 23.74 GB.** Asset paths and media records remain stable, and the production verifier checks every deployed file against the new release manifest.

### AI processing controls

- **VLM analysis now accepts only verified photographs.** Eligible media must have the `probable_photograph` classification, a `verified` or `source_verified` status, and an available source file.
- **Scans use OCR without a VLM attempt.** Standalone image OCR and scanned PDF fallback no longer send text pages to the vision model.
- **Visual analysis is now media-specific.** The VLM worker stores its description and run metadata on the selected media item. It no longer replaces document content or page OCR.
- **Pipeline order now enforces classification first.** Media extraction runs before VLM analysis so new extracted assets must pass the photograph and verification gate.

### Guardrails

- **Automated tests enforce the VLM eligibility rule.** Repository instructions also prohibit VLM work on scans, graphics, unknown media, missing files, and unverified photographs.

## 22.3.3 - 2026-09-03 - Media Verification Guard Repair

### Deployment safety

- **The active media-release verifier now works inside its intended read-only transaction.** It prepares its temporary ID table before entering read-only mode, then checks the deployed assets, source-document lineage, classifications, tag links, and exact catalog fingerprints without allowing persistent database writes.
- **Later deployments can enforce active media parity.** The deployment gate can now verify the promoted extracted-media release instead of failing while it creates its temporary verification workspace.

---

## 22.3.2 - 2026-09-03 - Extracted Media Promotion

### Production media parity

- **Production now receives the complete available extracted image catalog.** The release promotes 98,001 document-linked image records and their source assets from the enriched local archive. One stale row with a missing source file remains excluded and explicitly marked unavailable.
- **Album, tag, classification, and provenance data remain attached.** The importer maps albums and tags by name, preserves stable media identifiers, and validates every referenced source document before it writes data.
- **The promotion is additive.** It does not delete unrelated production media or source files.

### Deployment safety

- **Media promotion now has a repeatable audit, dry-run, and apply workflow.** The source audit marks missing files unavailable. The importer uses a transaction, a deployment lock, bundle checksums, asset-size checks, and exact database fingerprints.
- **Later deployments verify the active media release.** The deployment process preserves the release bundle and stops when its catalog records or assets no longer match.
- **Repository instructions now cover ignored media assets.** They state that a code deployment cannot publish `data/media/` and prohibit a synchronized-release claim before production verification passes.

---

## 22.3.1 - 2026-09-03 - Media Catalog Enrichment

### Enriched media catalog

- **The production image catalog now separates photographs from document scans and low-information graphics.** A deterministic classifier records the visual type, confidence, method, and measured image characteristics without treating machine output as source verification.
- **Missing source files now have an explicit unavailable state.** The enrichment pass excludes stale media rows from normal browsing and stops retrying them while unexpected classifier errors still block the release.
- **Every image and album now has readable catalog context.** The enrichment pass derives missing descriptions from source documents, pages, collections, visual types, and original filenames without inventing identities or events.
- **Small and empty album fragments are consolidated.** One-image subject albums move into relevant parent collections with their original tags and prior album context preserved. Empty extraction albums are removed without deleting media items or source files.
- **Existing visual AI work is available to media search.** Image records expose linked visual descriptions, model details, confidence, and review state while keeping AI interpretation separate from source provenance.

### Media browsing and review

- **Collections now use a clear hierarchy.** Source releases, curated subjects, and review material appear as separate groups on desktop and mobile, and the image browser omits albums with fewer than two visible images.
- **The default image view removes scanned-page noise.** Researchers can still include scans and low-information graphics through an explicit archival-view control.
- **Image details now lead with context and provenance.** The viewer shows collection, visual type, description, source position, index terms, and people before a collapsed technical-details section.
- **The mobile collection picker is compact and opaque.** Long collection lists scroll inside a solid menu, selected collections show concise context, and background content no longer reduces legibility.

### Production data operations

- **The database deployment now runs the media enrichment pass.** Each production release classifies unprocessed images, normalizes catalog context, and then runs the existing database certification gates.
- **The enrichment commands are repeatable.** Already classified records are skipped, catalog merges are idempotent, and the catalog cleanup runs in a transaction.

---

## 22.3.0 - 2026-09-02 - Mobile Reader and Release Integrity

### Mobile document experience

- **The document reader now prioritizes the document.** Redundant floating controls were removed, reader actions were consolidated, and the header and content layout now fit narrow screens.
- **Browser zoom is locked for the application shell.** Mobile users cannot accidentally zoom the interface in or out while they scroll through a document.
- **Navigation and sheets now respect mobile space.** Bottom navigation, modal sheets, document metadata, and reader controls use consistent safe-area spacing and touch targets.

### Mobile entity profiles

- **The profile section picker now uses the application menu system.** The white native dropdown was replaced with a dark, viewport-aware menu with large touch targets, active-section feedback, and keyboard support.

### Release integrity

- **Every production deployment now requires a new version and new release notes.** The deploy guard compares the pending release with its base commit and blocks reused versions, unchanged notes, stale dates, mismatched headings, and empty release entries.
- **Production CI checks release metadata before database or deployment work begins.** Repository instructions also require AI coding agents to update the version and notes before any production deployment.

### Local development reliability

- **Local API availability no longer flaps during database-heavy work.** The interface now uses a lightweight API liveness check, preserves the last healthy state across one transient failure, and stops sending co-presence heartbeats in development unless they are explicitly enabled.

### Visual evidence and provenance

- **Extracted PDF images now retain their exact source position.** The extraction pipeline records the source document, page, PDF object number, source-file hash, raw-object hash, derived-file hash, and extraction method, and it preserves repeated occurrences across documents.
- **The media browser distinguishes source verification from interpretation.** Page-matched assets show a source-verification state and link directly to the original document page; probable-photo classification and AI descriptions remain clearly labeled machine assessments.
- **Existing visual AI work is now searchable in the media library.** Media results correlate with linked image-document VLM text and summary artifacts, expose the model and review state, and include future VLM results during ingest and backfill.
- **Legacy extraction repair is bounded and resumable.** A maintenance command can re-read Poppler object manifests and repair missing page provenance without guessing unmatched locations.

---

## 22.2.0 - 2026-08-27 - Evidence Hypertext Library

### Evidence Search

- **Search now leads with exact source passages.** Matching source sentences appear with the document, page, release, provenance state, OCR confidence, and the reason for the match. AI summaries remain separate research aids.
- **Every surfaced passage has a durable evidence address.** Versioned citations pin the exact quotation, sentence index, document revision, text hash, and original asset hash so a later extraction change cannot silently move an existing reference.
- **Text and original scans stay connected.** Researchers can open the exact text address, open the hash-pinned source scan, copy either link, or move from the citation into the synchronized document reader.

### Correlation and Case Building

- **Duplicate records expose their source family.** Matching assets and repeated release occurrences can be compared without treating duplicate copies as independent corroboration.
- **Evidence can be collated without losing context.** Adding a passage to an investigation preserves the exact quote, page, source release, citation schema, hashes, provenance, and both text and scan links as one evidence item.
- **The release includes an in-app evidence showcase.** The Epstein Files overview demonstrates the passage-to-source workflow and provides direct searches for the estate trust response, Maxwell border encounter history, and the 12,841-file SDNY discovery production.

### Evidence Integrity

- **Published passage citations are append-only.** Corrections create new citation records; stored citations cannot be edited or deleted in place.
- **Corpus materialization is bounded and resumable.** Passage backfill runs in controlled batches while live searches can materialize verified passage records on demand.
- **This is the evidence-addressable foundation, not a false completeness claim.** The assertion graph, public corpus ledger, reviewed research threads, and immutable offline casebook exports remain later delivery slices.

---

## 22.1.0 - 2026-08-26 - Searchable Text Milestone

### Text Intelligence

- **The archive-wide text cleanup and summary backfill is complete.** More than 464,000 documents now have separately stored, provenance-bearing summary artifacts, with only non-enrichable or explicitly failed records outside the completed set.
- **AI output remains distinct from source evidence.** Summary artifacts retain their model and pipeline provenance, remain unreviewed until a researcher verifies them, and never replace preserved original files.
- **New evidence spotlights connect readers directly to source records.** The overview now features an Epstein estate trust subpoena response, Ghislaine Maxwell's CBP encounter history, and the indexed 12,841-file SDNY discovery production.

---

## 22.0.2 - 2026-08-02 - Media Evidence Scope

### Evidence Integrity

- Confirmed fake media and unverified claims no longer appear in normal media browsing, search, statistics, entity photos, evidence views, or forensic co-presence signals.
- The source files remain available for debunking and claim review. New ingestion marks each item as `debunking`, `claim_review`, or `evidence`.
- Legacy items are excluded through their album, source metadata, or file path.

---

## 22.0.1 - 2026-08-02 - Document Titles and Mobile Menus

### Document Titles

- Every document now has a useful title. The title policy uses the stored title, AI summary, clean OCR text, document number, and database ID in that order.
- The enriched database title backfill removed all remaining “Untitled” records.
- New documents receive a document-number fallback during insertion. AI enrichment replaces fallback titles when better source text becomes available.
- Title-only updates now preserve the existing OCR search vector instead of processing up to 100,000 source characters again.

### Mobile Media

- Album and publication dropdowns now render above page content on the mobile photo, audio, video, and article views.

---

## 22.0.0 - 2026-08-02 - Full Corpus Hosting

### Source Preservation

- **The acquired source corpus is now hosted directly by Epstein Archive.** Every original file referenced by the production database is present on the production server. A complete manifest audit verified 80,115 referenced originals with zero missing files.
- **Original PDF and image routes are restored.** File resolution now handles URL-encoded corpus paths, and production checks confirm original PDFs and images return their native content types instead of 404 responses.
- **Source agency availability is no longer required for document viewing.** Researchers can open preserved originals through Epstein Archive even if an upstream Justice Department URL changes or becomes unavailable.

### Operational Clarity

- **Hosting and indexing are reported separately.** The About page now states that source-file hosting is complete while search indexing and AI enrichment continue in the background.
- **The dashboard snapshot now reflects production.** Release data was regenerated from the live PostgreSQL database on August 2, 2026.
- **Corpus storage was made sustainable.** Obsolete builds, legacy databases, old backups, and redundant transfer containers were removed only after off-server checksum verification, preserving operational headroom without recompressing evidentiary files.

### Current Processing State

- Dataset 10 indexing remains in progress. All acquired files are hosted, but the release does not claim that search indexing or AI enrichment is complete.

---

## 21.7.0 - 2026-06-01 - Security & Database Hardening

### Security

- **CORS no longer allows localhost origins in production.** The localhost bypass in the CORS policy was unconditional — any `localhost:*` origin was accepted in all environments. It now only applies when `NODE_ENV !== 'production'`, so production deployments only accept the explicitly-listed origins (`epstein.academy`, `CORS_ORIGIN` env var).
- **Duplicate POST /invite route removed.** An early draft of the invite handler at `src/server/auth/routes.ts` was shadowing the canonical admin-gated implementation. The duplicate used an ad-hoc inline role check instead of `requireRole('admin')`, and issued 7-day invite tokens instead of 24-hour ones. The duplicate is gone; only the correct handler remains.
- **Presence heartbeat rate-limited for unauthenticated callers.** `POST /api/collaboration/heartbeat` accepts requests from guest users to power the co-presence indicator. It now applies the same `annotationWriteLimiter` (100 req/min per IP) used for annotation writes, preventing unauthenticated callers from spamming the in-memory presence store.

### Database

- **3 `int[]` → `bigint[]` cast fixes.** Three raw SQL queries were casting document/entity/hypothesis ID arrays to PostgreSQL `int[]` instead of `bigint[]`. These columns are all `bigint`; the wrong cast would silently overflow for IDs above 2,147,483,647 as the corpus grows. Fixed in `evidenceRepository`, `investigationsRepository`, and `documentsRepository`.
- **`f.*` replaced with explicit column list in icebergRepository.** `getLeads()` was selecting all columns from `danger_motif_findings` via `f.*`. This is now an explicit list matching the `FindingRow` interface, making the query schema-stable across future migrations.

### Code Quality

- **TableViewer uses server-provided column headers.** When the enrichment pipeline has extracted column headers from a tabular document (stored as `evidence.metadata.columnHeaders`, pipe-separated), the TableViewer now uses those as column definitions instead of auto-detecting from the first text row. This is more reliable for OCR-extracted tables where the first line may contain noise. Falls back gracefully to the auto-detect logic for legacy evidence.
- **Redundant triple cast removed in apiClient.ts.** `ents as unknown as Person[] as Person[]` → `ents as unknown as Person[]`. The final `as Person[]` was a no-op; the intermediate `unknown` cast is intentionally retained because the mapped search result objects are partial `Person` shapes (full hydration happens downstream).
- **Local smoke is DB-present by default.** The `pnpm local:smoke` runner now forces `NODE_ENV=development` and `RAW_CORPUS_BASE_PATH=./data`, and terminates the spawned server cleanly after the endpoint probes complete.

---

## 21.6.2 - 2026-05-28 - Server Logging Hardening

### Observability

- **All server log output now routes through the canonical structured logger.** The last two remaining `console.error`/`console.warn` calls in server code (a critical fallback in the subject-cards repository and a pipeline AI artifact failure warning) now emit structured pino log entries. This means every server-side error carries consistent fields (`err`, `documentId`, timestamp, log level) and is captured by the same log pipeline as all other server events.

---

## 21.6.1 - 2026-05-26 - Route Close Stability Patch

### Navigation Reliability

- **Routed surfaces now stay closed when dismissed.** Closing an entity profile, using Escape on an entity deep link, dismissing investigation evidence deep-link modals, and closing media direct-link viewers now remove or leave the URL trigger that opened them. This prevents the app from immediately reopening the same surface after a user closes it.
- **Regression coverage protects close behavior.** Added fixture-backed route-sync coverage for direct entity close and Escape close, plus unit coverage for investigation evidence return paths.

---

## 21.6.0 - 2026-05-20 - Provenance & Annotation Hardening

### Document Research

- **AI-generated summaries are now clearly separated from source text.** Previous versions stored AI-generated document summaries directly inside the document's metadata, making it impossible to tell which text came from the original file vs. an AI model. Summaries are now stored in a dedicated artifact store with a full provenance record (which model, when, what source text it read) and surfaced separately in document previews.
- **Document evidence types are now consistently classified.** A batch backfill corrected evidence type labels across the corpus so filters and search results reflect the actual nature of each document.
- **All database queries now fetch only the fields they need.** Removed "select everything" queries across the codebase — document lists, entity lookups, and search results now pull exactly the columns required. This reduces memory pressure and speeds up the most common read paths.
- **Duplicate database index removed.** The investigation leads table had a redundant index causing unnecessary write overhead on every update; it has been dropped.

### Annotation & Collaboration

- **Annotations now require a verified identity.** Document annotations previously accepted writes from anyone. They now require either a logged-in account or a cryptographic guest identity (see below). This closes a spam/spoofing surface and ensures every annotation has a stable, traceable author.
- **Guest annotation without an account.** Researchers who don't have a login can now annotate documents. On first visit, the browser generates a unique cryptographic keypair stored locally. Every annotation you submit is signed with this key, giving you a stable identity ("Guest XXXXXXXX") that persists across sessions on the same device — no registration required, no password, provenance intact.

### Performance

- **Faster responses on high-traffic routes.** Consolidated four overlapping server-side cache implementations into a single unified cache service with proper namespace isolation. This eliminates stale-data surprises from cache invalidation races and reduces redundant computation.
- **Pagination is now safe under large datasets.** Cursor and offset pagination logic was hardened to handle edge cases at the boundaries of large result sets that previously could cause silent data gaps or repeated rows.
- **Background pipeline jobs are more efficient.** The ingestion pipeline's async concurrency primitives were consolidated — eliminating redundant semaphore layers and making job queuing predictable under load.

### Reliability

- **Error responses are consistent across the entire API.** Previously each route had its own ad-hoc error format. All server errors now flow through a single error handler, producing a uniform response envelope. This makes client-side error handling and debugging dramatically simpler.
- **Rate limits are now uniform and explicitly named.** Every API endpoint that had a rate limit now uses a named, centrally-defined limit rather than scattered magic numbers. Auth limits, annotation limits, search limits, and entity caps are all visible in one place.
- **Production deploy preflight is tighter.** The canary readiness check now retries against live data, the schema drift gate runs on every deploy without bypass options, and DB extension checks are fail-closed.
- **Email threads now reliably load under slow connections.** The email thread list query timeout was raised to handle heavier mailboxes that were intermittently timing out on production.
- **Search vector migration is safe on live data.** The production full-text search vector migration was hardened to run safely on populated tables without locking or data loss.

### Platform Stability

- **Schema hash tracking is robust in all environments.** The schema integrity check now correctly handles environments without a database connection, skipping gracefully with a warning rather than blocking unrelated work.
- **Subjects and metadata routes are consolidated.** Several overlapping API routes for entity subjects and document metadata were merged into canonical endpoints, eliminating duplicated logic that could produce inconsistent results.
- **Release gates have no skip paths.** All test and lint skip annotations have been removed. The only way a release passes now is if all checks actually pass.

---

_Technical notes: 29 substantive commits since 21.5.0. Internal: AI summary provenance isolation, guest ECDSA identity, cache consolidation, SELECT _ removal, annotation auth hardening, unified error handler, App.tsx route/modal split.\*

## 21.5.0 - 2026-05-18 - Production Hardening Release Candidate

### Production Reliability

- **Core Graph Query Optimization**: Completely re-architected the `getGlobalGraphNodes` database query. Swapped out the slow Nested Loop optimizer plan with an extremely efficient Two-Stage Array-Parameter Execution Plan. Slashing query execution response times from 9,000ms+ down to ~1,400ms (a 6.3x speedup under heavy load).
- **Playwright Rate Limit Stabilization**: Resolved intermittent `429 Too Many Requests` API failures during concurrent end-to-end testing by dynamically raising the rate limit window max requests to 10,000 in development and test environments.
- **Strict Database Telemetry Guard**: Re-enabled and secured the strict `pg_stat_statements` database connectivity and query profile extension check in the production deploy preflight checks.
- **Strict No-Skip Release Gates**: Removes release-skip exceptions from the test suite, turns fixture/data preconditions into hard assertions, and makes `check:release-trust` fail on any Playwright/Vitest skip API.
- **Fail-Closed DB Gates**: Requires matching PostgreSQL client tooling for DB-backed gates, fails when `DATABASE_URL` is absent in CI, and runs an explicit plan syntax gate on sparse CI databases instead of silently skipping explain coverage.
- **No Mock Report Output**: Replaces fabricated forensic report content, fake evidence IDs, and demo export text with deterministic sections derived from live archive API responses.
- **Deployment Guard Tightening**: Removes the hard-coded production host default, requires `EPSTEIN_PROD_HOST`, restores the `pg_stat_statements` production gate, and fails production startup when `RAW_CORPUS_BASE_PATH` is missing.
- **Bundle Budget Gate**: Adds a production bundle budget check and wires it into `prebuild:prod`.
- **Static Analysis Baselines**: Adds Knip and SELECT-star audit helpers to make cleanup debt visible without blocking this release candidate.
- **Client OCR Surface Removal**: Deletes unused browser OCR services from the client bundle surface.

### Release Preconditions

- Production deployment must be run from an environment with `EPSTEIN_PROD_HOST`, SSH configuration, `DATABASE_URL`, and `RAW_CORPUS_BASE_PATH` available.
- No release test skips or release-skip annotations are allowed.

## 21.4.0 - 2026-05-18 - Pipeline Recovery & Visual Intelligence Stabilization

### Production Reliability

- **VLM Backfill Readiness**: Waits for the configured EXO vision model before visual parsing, attempts model placement when capacity is missing, and writes a live blocked reason while backfill is waiting.
- **Watchdog-Safe Pipeline Stages**: Keeps the unified pipeline heartbeat fresh while long-running subprocesses are active so legitimate VLM and enrichment work is not mistaken for a dead job.
- **Production Pipeline Launch Repair**: Runs the PM2 unified pipeline through the local `tsx` binary and pins production enrichment to lighter text and vision model defaults.
- **Live Pipeline Telemetry**: Adds an uncached public pipeline status endpoint and refreshes the About page status widget in real time.
- **Schema Contract Alignment**: Updates the committed schema hash to the current verified Postgres contract for the release.

## 21.3.0 - 2026-05-12 - Production Deployment Recovery & Strict Hygiene

### Production Reliability

- **Auth-Injecting Deployment**: Injects the `GH_TOKEN` explicitly into production GitHub Actions workflows and updates the `deploy.sh` polling daemon to utilize standard Bearer authorization, resolving recursive rate-limit 403 starvation.
- **Total Static Cleanse**: Achieves a 100% green `pnpm lint` state by converting all existing `any` casts, duplicate hooks dependencies, and recursive effect cycles across client React hooks and server data persistence repositories.

## 21.2.16 - 2026-05-12 - WIRED Press Archive Repair

### Production Reliability

- **WIRED Article Restoration**: Re-seeds the WIRED article by canonical link with correct publication metadata, author, publish date, and a durable archive thumbnail.
- **Broken Media Repair**: Replaces the nonnumeric `wired_cover_1` media id with a numeric media row the thumbnail API can serve, and points it at a deployable public asset instead of ignored local data.
- **Thumbnail Resilience**: Adds a graceful media-browser fallback so a missing thumbnail renders an archive card instead of the browser's broken-image icon.
- **GitHub Actions Modernization**: Bumps action dependencies to the canonical v6 Node-aligned releases, formally resolving runner deprecation alerts across all workflows.
- **Bundler Initialization Safety**: Reverts accidental activation of the experiment manualChunks directive to neutralize the `AsyncMode` runtime race condition.

## 21.2.15 - 2026-05-12 - Analytics Maintenance & Component Decoupling

### Production Reliability

- **Analytics Scheduler Activation**: Formally bootstrapped the maintenance lifecycle daemon to provide continuous analytical view refreshes, catching out-of-band data ingestion signals and resolving stagnant corpus stats.
- **Redaction Contract Realignment**: Overlaid explicit `redactedCount` property definitions into the production DTO map to restore direct, backward-compatible connectivity with standard component telemetry.
- **Component Collapsing Prevention**: Re-engineered the native list-grouping mechanism inside standard Flex button containers to eliminate rendering overlaps and typography collision hazards on high-density viewports.

## 21.2.14 - 2026-05-12 - Hot Path Cutover Guard

### Production Reliability

- **Fast Subject Cards**: Keeps the People front page on indexed stored quality flags with JS post-filtering while deploy-time quarantine enforces the full SQL junk policy.
- **Static Root Preservation**: Prevents the DB deployment phase from deleting the live `dist` symlink before a new release artifact is promoted.
- **Cutover Timeout Alignment**: Extends the inline live-cutover entity gate timeout and adds the new junk patterns to the canary verifier.

## 21.2.13 - 2026-05-12 - Entity Quality Boundary Fix

### Production Reliability

- **Postgres Junk Predicate Fix**: Uses PostgreSQL word-boundary regexes for entity-quality SQL so junk phrases like “Bluray Disc” and “Kimberly Meder Direction” are actually quarantined and filtered.
- **Fast Junk Search Guard**: Skips entity search work for junk-like search terms so quality gates cannot time out on known-bad phrases.
- **Actionable Quality Gate Errors**: Raises the entity-quality verifier timeout and reports the failing endpoint path when a probe aborts.

## 21.2.12 - 2026-05-12 - Front Page Entity Quality Gate

### Production Reliability

- **Front Page Entity Integrity**: Enforces the full junk-entity predicate in the subject-card repository path so polluted OCR/object fragments cannot surface on the People front page.
- **VIP Canonical Sync**: Promotes the canonical 300+ person VIP rules into clean, reviewed database entities during deploy so the front page respects the investigation priority list.
- **Cutover Gate Coverage**: Expands production entity-quality verification across both subject and entity APIs, including the exact junk patterns found in the live screenshots.

## 21.2.11 - 2026-05-12 - Design System Drift Guardrails

### Production Reliability

- **Shared Component Enforcement**: Adds design-system audit and shared-component drift gates so hand-rolled controls cannot silently reappear.
- **Interaction Primitive Cleanup**: Moves custom email, evidence, redaction, connection, black book, and settings controls onto shared `Button`, `Switch`, `AnimatedSegmentedControl`, and `InteractiveBadge` primitives.
- **Tokenized Warning and Presence UI**: Removes inline styling from sensitive-content warning and collaboration presence surfaces, ratcheting the audit baseline down for future patches.

## 21.2.10 - 2026-05-12 - Email Default Filter Isolation

### Production Reliability

- **Email Default Isolation**: Stops the email workspace from inheriting global date filters on first load so the default inbox is all non-junk mail across all people unless the email UI or URL explicitly applies filters.

## 21.2.9 - 2026-05-12 - Email Defaults and Media Visibility

### Production Reliability

- **Email Inbox Defaults**: Opens Emails with all people, non-junk mail, post-mortem Yahoo mail, and empty/redacted bodies visible by default.
- **Email API Defaults**: Makes bare email thread and mailbox API calls use the same inclusive defaults so the UI cannot silently show an empty inbox.
- **Media Sensitivity Consistency**: Aligns media warnings, thumbnails, and audio/video players behind one global sensitive-content switch.

## 21.2.8 - 2026-05-11 - Email Workspace Incident Guardrails

### Production Reliability

- **Email Thread Recovery**: Corrected the email category SQL CASE expression so `/api/emails/threads` no longer fails with a Postgres syntax error.
- **Cutover Coverage**: Added email thread verification to the live cutover gate so email workspace regressions fail before promotion.
- **Chunk Compatibility Bridge**: Seeds retained release assets into new builds and verifies the JS asset import graph so cached clients do not lose lazy-loaded workspaces during deploys.

## 21.2.7 - 2026-05-11 - Static Root and Backup Safety

### Production Reliability

- **Static Root Invariant**: Reasserts the promoted `dist` symlink after source-tree cleanup and fails closed if `dist/index.html` is not present before any deploy can continue.
- **No Foreground Backup Load**: Removes heavyweight backup verification from the default deploy critical path so interrupted deploys cannot leave `pg_dump` jobs degrading live traffic.

## 21.2.6 - 2026-05-11 - Future Deploy Detector Hardening

### Production Reliability

- **Pipeline-Safe PM2 Detection**: Removed the deploy detector's dependency on environment propagation across shell pipelines so future deploys reliably branch between cluster cutover and readiness-gated reload paths.

## 21.2.5 - 2026-05-11 - PM2 Cutover Detector Fix

### Production Reliability

- **PM2 Mode Detector Fix**: Corrected the deploy-time PM2 JSON parser so the zero-interruption cluster migration can detect `fork_mode` without shadowing Node's `process` object.

## 21.2.4 - 2026-05-11 - Production Hardening Follow-Through

### Production Reliability

- **Blue/Green PM2 Mode Migration**: Added a zero-interruption cluster cutover that temporarily routes Nginx to a verified cluster candidate, recreates the primary PM2 app in cluster mode, verifies it locally, and only then returns public traffic.
- **Runtime Import Guard**: Added a built-server import resolver check so compiled output cannot ship unresolved TypeScript aliases or missing runtime modules.
- **Scheduled Public Canary**: Added a GitHub Actions production canary that runs the live-data cutover verifier every 15 minutes against `https://epstein.academy`.

## 21.2.3 - 2026-05-11 - Zero-Interruption Live Data Cutover

### Production Reliability

- **Public Live-Data Gate**: Added a production cutover verifier that fails closed unless the public origin serves health, strict readiness with nonzero core data, Postgres metadata, analytics counts, and the redactions document contract.
- **Canary Before Promotion**: Builds now happen in an isolated release worktree, launch a canary process, and only promote the verified artifact after live-data checks pass.
- **Atomic Artifact Rollback**: Production `dist` promotion now uses an atomic symlink switch with rollback targeting the previous live artifact.
- **Readiness-Gated Reloads**: Replaced destructive PM2 stop/delete restarts with cluster-mode, readiness-gated reloads to keep traffic served during cutover.
- **Redaction Workspace Clarity**: Reframed the redaction page as a review workflow with explicit purpose, next steps, and safer interpretation of inferred candidates.

## 21.2.2 - 2026-05-11 - Entity Filtration Hardening

### Pipeline & Infrastructure

- **Entity Leakage Patch**: Upgraded entity ingestion pipeline to use RegEx word-boundary detection instead of strict string equality, preventing compound phrases (e.g., "Associates Inc", "Trust Agreement") from bypassing blacklists.
- **Dynamic Guardrails**: Re-wired the server's endpoint filter logic to dynamically generate exclusions from the canonical shared blocklist, replacing disconnected hard-coded lists.
- **Decontamination Sweep**: Automatically purged legacy duplicates and chronological fragments ("On Mon") that snuck in through development bypasses.

## 21.2.1 - 2026-05-11 - Entity Links & Inbox Settings

### Knowledge Graph Hardening

- **Identity Adjacency Seeding**: Injected and verified robust graph bindings for the master collection of 28 critical high-profile targets, establishing direct deterministic `associated_with` vectors into core dataset nexus points.
- **Dynamic Sidebar Iteration**: Shifted the manual navigation list to optimized iteration rendering, ensuring instantly addressable search vectors for the entire watch-list array.

### Inbox Control Layer

- **Modal Settings Dashboard**: Shipped high-fidelity fluid overlay provisioning global inbox suppression toggles with native persistence logic.
- **Post-Mortem Pruning**: Enforces conditional temporal restriction blocking post-August-2019 email volumes, effectively purifying inbox contents against late-stage spam leakage.
- **Structural Length Guarding**: Injected content validation gate preventing empty-transmission rows from rendering in default workflows.

## 21.2.0 - 2026-05-11 - Email UI Overhaul & Provenance Recovery

### Email Workspace Reconstruction

- **Modern Sidebar Accordions**: Migrated legacy mailbox listing to a hierarchical Folder structure, integrating standalone `Compose`, standard system labels, collapsible `TOPICS` classifiers, and curated High-Value `PEOPLE` watchlists.
- **Gmail Aesthetic Rows**: Overhauled thread item density to full-width horizontal tables featuring distinct metrics cluster (Stars + Impression counts) and cross-provider integration badges.
- **Master-Detail Pivot**: Dynamic grid container logic collapses parallel views to grant maximum horizontal clarity for bulk Inbox scans, matching classic workflow mechanics.
- **Dashboard Sub-Tabs**: Injected primary container partitioning navigation (Primary/Promotions) directly atop active datasets.

### Data Fidelity & Logic Repair

- **Provenance Pipeline Recovery**: Executed hotfix directly addressing query runtime exception by removing `credibility_score` selector, restoring standard rendering for entire Provenance & Source Attribution UI surface area.

## 21.1.3 - 2026-05-11 - Panoramic Graphs & Telemetry Recovery

### Visual Architecture & Navigability

- **Panoramic Claim Graphs**: Upgraded the evidentiary relationship visualization from a 1:1 constrained view to a kinematic 320x120 viewport, doubling native point resolution and drastically improving information density.
- **Momentum Interaction**: Native physics-enabled click-and-drag panning was integrated utilizing the Framer-Motion driver, unlocking full spatial navigability across large node clusters.
- **Inline Relation Tokens**: Injected explicit context labeling directly onto graph connection vectors, removing label-ambiguity latency.

### Monitoring & System Stability

- **Widget Bridge Rehabilitation**: Re-aligned aggregate database scan queries to follow the post-cleanup v21 canonical table names, clearing silent null response loops and fully restoring standard pipeline status telemetry on external dashboard instances.
- **Concurrency Throttle Tuning**: Extended aggregation statement boundaries to adapt strictly to million-row scalability limits, neutralizing hard timeouts.

## 21.1.2 - 2026-05-11 - Core Metadata DOJ Source Extension

### User Interface & Evidence Provenance

- **Canonical DOJ Sourcing**: Fully wired document canonical links from the database storage directly through to the Core Metadata interface panel.
- **Inline Link Presentation**: Added explicit "DOJ Source" row to the Apple-style metadata stack inside the primary document rail, allowing investigators to bounce directly to the original source files where accessible.

## 21.1.1 - 2026-05-11 - Interface Symmetry & Grid Hardening

### User Interface & Geometry

- **Grid Intersection Calibration**: Solved 1.5px - 2px doubling artifact where entity cards intersect in high-density viewports. Applied absolute integer border-collapse mathematics (`margin: -1px`) ensuring unified single-pixel crisp dividing lines across all responsive scaling factors and DPI ratios.
- **Skeleton Synchronization**: Integrated structural loading state skeleton components into the unified container geometry protocol, guaranteeing precise corner rounding synchronicity during background hydrate loops.

## 21.1.0 - 2026-05-11 - Performance & Graph Symmetry Optimization

### High Performance Traversal Engine

- **O(1) Recursive Traversal**: Deleted the high-latency sequential JS while-loop inside `relationshipsRepository`, replacing it with an atomic PostgreSQL Recursive CTE. Graph execution times have plummeted from upwards of 5 seconds to under 400ms on maximum-density vertices.
- **Graph Symmetry Scaling**: Unified adjacency builds into a symmetric recursive union set, effectively doubling total edge ledger visibility from 1.6M to 3.28M rows. Graph lookups are now fully Undirected traversals, completely eliminating one-way vertex blindspots.
- **Real Data Propagation**: Exposed dynamic `risk_score`, `confidence`, and true document count overrides across the entire traversal path, driven by live dataset snapshots.

### Stability & Cleanliness

- **Hardened Schema Migrations**: Applied robust `to_regclass()` dynamic SQL protections to production migrations, ensuring backup flows skip non-existent legacy infrastructure cleanly without causing exit failures.
- **Smoke Log Noise Suppression**: Upgraded the `intelligenceRepository` with silent `42P01` (Undefined Table) capture, entirely eliminating optional queue spam from development and production system logs.
- **Bigint/Text Type Fix**: Patched a legacy logic defect causing runtime cast exceptions by correcting a cross-table from_entity join in the financial analyzer toolkit.

## 21.0.0 - 2026-05-10 - Technical Debt Consolidation & Schema Hardening

### Major Architecture Upgrades

- **V21 Consolidated Migration Matrix**: Initiated total elimination of legacy Postgres artifacts via a rigorous, cascading 8-stage migration strategy. Purged stale taxonomies, collapsed overlapping relation tables, resolved severe duplicate-indexing inflation, and hardened referential integrity across the documents spectrum.
- **Mapping Core Decoupling**: Eradicated thousands of lines of redundant Node.js mapping logic (`flightsDtoMapper`, `graphDtoMapper`, `analyticsDtoMapper`, `propertiesDtoMapper`) in favor of clean, database-native TypeScript serialization.
- **Automated Quality Guards**: Introduced `check_dead_schema_surfaces.ts` and `check_duplicate_indexes.ts` into the core CI suite to mathematically prevent systemic drift proliferation going forward.

### Features & Visualization

- **Sub-Graph Signal Explorer**: Materialized the dedicated `MiniClaimGraph` visualization module, decoupling granular claims telemetry from bulk workspace renders.
- **Network Layer Stabilization**: Consolidated internal signal graph bindings across client-side mapping functions, guaranteeing clean frame loads during rapid network topology manipulations.

### Critical Hotfixes

- **Image Gallery Restoration**: Repaired a breaking bug where `excludeTextScans` state inversion caused all forensic captures to filter out of the gallery interface.
- **Contextual Navigation Stability**: Shipped rigorous modal back-navigation protocols providing flawless scroll retention and historical context recovery across long entity examination workflows.

## 20.8.0 - 2026-05-10 - Intelligence & Co-Presence Release

### For Investigators

- **Unredaction Workbench UI (Gap 3)**: Exposed unredaction capabilities so investigators can view redacted spans, dynamic confidence metrics, and potential candidate guesses with manual override capabilities.
- **Cross-Document Corroboration Engine (Gap 4)**: Aggregates claims represented across independent files, showcasing backed source documents with interactive preview snippets.
- **Forensic Interaction Analytics (Gap 5)**: Deepens email research by adding visual pairwise communication matrices and thread heatmaps.
- **Public Read-Only Guest Mode (Gap 6)**: Enables account-free read-only access utilizing a secure guest JWT session.
- **Court Records & Legal Tracker (Gap 7)**: Introduces a dedicated legal tracker mapping trial transcripts, congressional hearings, depositions, and exhibits directly to active cases.
- **Network Graph Shortest Path-Finder (Gap 8)**: Implements an optimized BFS shortest-path query and an interactive "Shortest Connection Path" autocomplete overlay inside the Network Page.
- **Survivor & Witness testimonies (Gap 9)**: Surfaces a respectful, sensitive research layer gated by a high-visibility, professional content discretion warning banner.
- **Real-Time Collaboration Presence (Gap 10)**: Displays an active co-presence heartbeat and a pulsing, animated indicator showing other active researchers collaborating on the same page.

### Why It Matters

- Investigators can work cooperatively across case files in real-time with precise awareness of team actions.
- Multi-source claim aggregation and shortest-path graph calculations provide unprecedented analytical speed for uncovering key networks.
- A respect-first, gated survivor testimony repository honors the individuals involved while maintaining airtight archival integrity.

## 20.7.0 - 2026-05-10 - Trust & Verification Release Candidate

### For Investigators

- **Claim-Level Provenance Contract**: AI-extracted claim triples now carry explicit source document IDs, source hashes, extraction method, review state, verification timestamp, and provenance status through the API contract.
- **Claim Detail Provenance Visibility**: Claim detail pages now surface provenance status, extraction method, review state, and source hash directly beside the claim instead of leaving those trust signals implicit.
- **Semantic Search Honesty Pass**: Global search now sends Keyword, Conceptual, or Hybrid mode to the backend, preserves semantic match reasons in returned document results, and reports whether pgvector embeddings are actually populated or lexical fallback is active.
- **Release Trust Gate**: Added `pnpm check:release-trust`, a release-only gate that fails when critical investigation specs contain quiet skips or release workstreams remain marked blocked/in-progress.
- **Black Book Type Hardening**: Removed the remaining explicit `any` usage from the Black Book repository so lint output can be treated as a genuine release signal.

### Why It Matters

- Machine-extracted claims are now harder to mistake for verified facts: the API and UI carry source and review metadata with the claim itself.
- Researchers choosing Conceptual or Hybrid search now get a real backend mode request plus visible readiness/fallback state, closing the most misleading part of the previous semantic search experience.
- Release readiness now has a hard transparency check for skipped golden-path coverage, helping prevent a green test run from hiding missing fixture data.

## 20.6.3 - 2026-05-09 - Black Book Accessibility, Dataset-Specific Album Grouping & Photographic Evidence Filtering

### For Investigators

- **Refined Black Book Card Details**: Compacted and cleaned the layout of contact grid cards in the Black Book directory to hide long rows, adding clear and intuitive "Open full card" hints indicating any hidden numbers or locations.
- **Enhanced Black Book Accessibility**: Added robust keyboard navigation support (`Enter` and `Space` key event listeners, `role="button"`, and standard tab indexing) to all grid cards to allow effortless, hands-free review workflows.
- **Advanced Photographic Evidence Filtering**: Overhauled the Photo Browser to exclude all OCR-heavy pages, raw text scans, and unconfirmed document extracts from statistics, format breakdowns, and album breakdowns. Added a comprehensive database query filter (`nonTextExtractPredicate`) to ensure the photographic gallery only contains genuine photographic evidence.
- **Dataset-Specific Album Grouping**: Configured the media ingestion pipeline to group extracted assets into dedicated dataset folders instead of clustering them in a single generic "Extracted Media" album, preserving perfect document context.

### Why It Matters

- Cleaner Black Book cards make scanning Epstein's directory significantly easier, while keyboard accessibility satisfies high HIG standards.
- Removing non-photographic OCR scans from the Photo Browser ensures that the gallery is truly a visual archive rather than a collection of scanned pages.
- Preserving dataset-level context for extracted images makes it easy to trace visual evidence back to specific source collections.

## 20.6.2 - 2026-05-09 - Black Book Card Modal, Dynamic Categories & Media Viewer Polish

### For Investigators

- **Dynamic Black Book Categories**: Eliminated blank filter states for Contact and Credential tabs. The system now dynamically analyzes entries on the fly to route credentials (passwords, PINs, usernames) and structured contact entries (emails, phones, addresses) to their respective category filters.
- **Premium Address Book Modal**: Clicking any card in the Black Book directory now triggers a gorgeous, custom glassmorphic modal representing a true Contact Card. Features dedicated high-contrast grids for phone numbers, email addresses, and locations with instantaneous Copy, Call, and Mailto micro-interactions, alongside full provenance links to source documents.
- **In-Modal OCR/Pretty View Slider**: Re-engineered the detailed Contact Modal with an integrated Pretty vs Raw OCR comparison toggle, allowing researchers to switch seamlessly between clean extracted information and raw transcoded OCR text inline.
- **Responsive Category Filters**: Refined padding, margins, and flex-wrapping behaviors for the Black Book category segmented bar, guaranteeing perfect responsive alignment across small tablets and mobile devices.
- **Media Viewer Close Button Fix**: Restructured stacking contexts by adjusting z-indices so that the document navigation toolbar stays unblocked and sits clearly above the image stage container, restoring full clickability to the Close button.

### Why It Matters

- Resolving blank filter states allows analysts to isolate sensitive credentials and contacts instantly across Jeffrey Epstein's entire directory.
- The high-fidelity details modal replaces tedious card scrolling with an organized, interactive forensic card view.
- Ensuring the Media Viewer close button remains unblocked improves general platform navigation and fluid review workflow loops.

## 20.6.1 - 2026-05-09 - Forensic Logo Overhaul, Glitch Redactions & Wired Press Ingestion

### For Investigators

- **Forensic Logo Overhaul**: Transformed the plain text header logo into an official intelligence-division-style badge. Added a glowing holographic circular badge enclosing a futuristic `Fingerprint` icon in soft blue, wrapped in a glassmorphic cyber-card with a custom subtitle (`CLASSIFIED SIGNAL`). Hovering over the logo applies dynamic sizing expansions and subtle neon glow increases.
- **Glitch-Scramble Redaction Transitions**: Upgraded the redaction transitions to feel highly immersive and technological. Individual characters now undergo rapid cybernetic scrambling (`█`, `▓`, `▒`, `░`, `Δ`, `Ø`, `X`, etc.) before solidifying, accompanied by a high-speed `.letterGlitching` chromatic aberration flicker animation that skews, skews, and splits text in rose-red and cyan.
- **Alternating Secret Campaigns**: Implemented multiple secret campaign titles (including `'THE TRUMP FILES'`, `'OPERATION EPSTEIN FURY'`, and `'TRUMP-EPSTEIN FILES'`) that decode and swap dynamically at frequent, coprime odd intervals (`% 3` and `% 5` cycles) before smoothly unscrambling back to standard text.
- **WIRED Press Article & Dedicated Media Album**: Integrated the latest WIRED article concerning the physical Epstein Files archive library in New York. Created a dedicated database migration seeding the article metadata, registering a dedicated `"Wired"` album, and attaching a high-fidelity newly generated cover image inside `media_items`.
- **Investigation Workspace Blue Gradient & Border Bleed**: Resolved a critical inline styling conflict in `InvestigationWorkspace.tsx` that was blocking the custom glassmorphic phthalo blue gradient background. Flattened adjacent nested container corners to ensure the background bleeds flawlessly across borders with zero dark gaps.
- **Left-Aligned Folder Navigation**: Corrected the album folder layout in sidebar browsers to left-align folder icons and text naturally with full-width HIG rows, eliminating awkward centered clumping on wider displays.

### Why It Matters

- Dynamic, high-tech logo details and scramble animations create an extremely premium, alive, and interactive " Classified Intelligence Agency" workbench aesthetic.
- Swapping secret campaigns at odd intervals adds immersive, thematic depth across investigation sessions.
- Ingestion of WIRED coverage ensures that the press archive is fully complete and up to date with the latest physical library announcements.

## 20.6.0 - 2026-05-08 - Workspace Polish, Interactive Heatmaps & Layout Refinements

### For Investigators

- **Prominence-Based Heatmap Spectrum**: Transformed the monochrome interactive entity treemap into an advanced visual heatmap spectrum. The system dynamically assigns gorgeous, vibrant color gradients based on sorted prominence rank indexes, grouping top figures into distinct visual tiers (Rose-Red for Top 3, Purple for Top 10, Blue for Top 20, Cyan/Teal for Top 35, and Emerald-Teal for remaining entities).
- **Corrected Max Mentions Display**: Fixed the metric source in the summary footer cards to pull from the active filtered `topEntities` list rather than the unpopulated empty array. Real-time stats now accurately display the actual highest frequency (e.g. Jeffrey Epstein's 11,154 mentions) instead of fallback `0`.
- **Bookmarkable Black Book Searches**: Overhauled the contact search system inside `BlackBookViewer.tsx` to read and write terms directly via `useSearchParams()`. Search states are now fully persistent, shareable, and bookmarkable.
- **Removed Duplicate Investigation Headers**: Cleaned up the navigation/header hierarchy in `InvestigationWorkspace.tsx` to eliminate redundant secondary headers, saving valuable vertical pixel estate on desktop screens.
- **Smart Document Previews**: Updated document previews to prioritize rich AI Summaries. When not available, the cards automatically extract and display a clean OCR text snippet followed by ellipsis, ensuring investigators never see generic "OCR heavy document..." placeholders.
- **Cleaned Card Popups & Repositioned Provenance**: Removed bulky, slow-to-appear hover popups from document cards. Repositioned the Provenance `[?]` indicator up next to the risk rating `[R1]` on the top line for a tighter, cleaner presentation.
- **Caret Overlay Fixed**: Adjusted select dropdown styles across the client app to guarantee caret indicators never overlap active selection text.
- **Renamed Photo Archive to Images & Fixed Grid Scaling**: Standardized terminology to "Images" across headers, buttons, and SEO tags. Corrected layout bugs in the photo album view where grid items would stretch awkwardly by forcing `object-fit: contain !important`.
- **Flights and Timeline Layout Repairs**: Resolved padding, margins, and header alignment bugs within the Flights and Timeline view containers to keep data grids properly aligned and responsive.
- **Desktop Grid Alignments**: Removed legacy center-alignments from desktop views to enforce a cleaner, professional left-aligned hierarchy that maximizes readability.

### AI Enrichment & DB Snapshot

A fresh database and AI extraction snapshot has been compiled into the public client layer. The current archive contains:

- **Documents**: 1,425,129 total files
- **Refined Documents**: 315,332 semantic-repaired and OCR cleaned tranches
- **Claim Triples**: 713,123 agentic extracted entity relationships
- **Financial Transactions**: 1,383 verified forensic transactions
- **Direct Relations**: 11,721 validated graph connections
- **Timeline Events**: 314 automated pipeline timeline extracts

### Why It Matters

- Investigators can spot key network nodes instantly via a rich visual heat spectrum instead of sorting through flat gray blocks.
- Reliable summary metrics provide an accurate quantitative overview of the dataset's high-profile connections.
- Clean left-alignment across lists prevents cognitive fatigue on wide screens, creating an extremely premium workspace.

## 20.5.3 - 2026-05-08 - Email Viewer Crash Fix

### For Investigators

- **Email Viewer Crash Fix**: Opening any email thread no longer causes a "Something went wrong" crash (browser history.replaceState throttle limit). The email workspace is fully stable again.

### Why It Matters

- Investigators can open and read email threads without the app crashing immediately on open.

## 20.5.2 - 2026-05-08 - High-Fidelity OCR Backfills & High-Density Entity Views

### For Investigators

- **High-Fidelity OCR Backfills**: Upgraded the AI Enrichment pipeline to support high-fidelity re-summarization backfills. Low-confidence or MIME-corrupted documents undergo LLM OCR re-correction first, with the cleaned text then used to overwrite noisy summaries in metadata.
- **High-Density Entity Overview**: Optimized the vertical layout and collapsed excessive whitespace in the Entity Overview tab. Removed redundant inline flag buttons to reclaim significant screen space, creating a beautifully tight forensic workbench.
- **Dynamic Days Delayed Counter**: Added a real-time compliance tracker to the main stats dashboard calculating days elapsed since the unredacted Epstein Files release order (November 19, 2025).
- **Bespoke Animated Loader**: Replaced all generic loaders with an custom dual-concentric orbital gradient pulsing node spinning in opposition.
- **Übersicht Widget Polish**: Accurate pipeline phase indicators and mathematically capped progress stats with support for a new LLM Re-Corrected progress bar.

### Why It Matters

- Investigators now read summaries of fully corrected text instead of unreadable OCR cruft.
- Improved vertical information density lets analysts scan entire entity summaries without excessive scrolling.
- Real-time days-delayed tracker highlights ongoing compliance delays on the main dashboard.

## 20.5.1 - 2026-05-07 - Entity Network Navigator + Document Significance Scoring

### For Investigators

- **Entity Network Navigator**: A full-screen interactive graph at `/network` lets you explore every entity and their connections across the corpus. Filter edges by signal type — Financial, Flights, Communications, or Direct Links — and search to isolate entities of interest. Clicking a node opens an in-canvas panel showing top connections and a link to the full profile.
- **Connections Tab in Entity Profiles**: Each entity profile now has a Connections tab listing all known connections with signal type, strength, and evidence count. A search field lets you filter by name when an entity has many connections.
- **Document Significance Scoring**: Documents are now scored for investigative significance based on entity density, financial signals, flight records, and claim density. Scores appear as colour-coded badges on document cards. The Evidence tab defaults to sorting by significance so the most relevant documents surface first.
- **Signal-Typed Graph Edges**: Network graph edges are now colour-coded by signal type — teal for financial, amber for flights, violet for communications, and neutral for direct links — making the structure of connections legible at a glance.

### Why It Matters

- The network graph makes it possible to answer relationship questions ("who was connected to whom, and through which signals?") without reading individual documents.
- Significance scoring reduces the time spent triaging the 1.4M-document corpus: investigators see the highest-value documents first rather than most-recent or alphabetical.
- Connections are backed by evidence counts and confidence scores, keeping the difference between a documented link and an inferred one visible at all times.

## 20.5.0 - 2026-05-07 - Design System Controls and Document Source Polish

### For Investigators

- **Codified App Navigation**: Header controls, desktop segmented navigation, and mobile bottom navigation now live in shared design-system navigation patterns instead of one-off component styling.
- **Consistent Control Surfaces**: Unique app-shell controls keep their intended visual behavior while using shared component contracts, reducing the risk of future design-system sweeps breaking the interface.
- **Calmer Source Widgets**: Provenance/source chips now use muted dark glass styling instead of bright white backgrounds, keeping source metadata available without overpowering document headers.
- **Document Review Polish**: Document viewing controls and source metadata were tuned to feel less visually noisy during source review.

### Why It Matters

- Investigators should be able to scan document headers quickly without provenance widgets competing with the file title.
- Navigation is now a deliberate design-system pattern, so future UI work has a safer place to extend app-specific controls.

## 20.4.0 - 2026-05-06 - Iceberg Intelligence: Lead to Proof

### For Investigators

- **Iceberg Intelligence Workspace**: Added a new default investigation tab that starts with surfaced leads and lets investigators drill into relationship paths, source documents, timeline context, and saveable evidence chains.
- **Lead to Proof Flow**: Each surfaced lead now moves through a practical investigation sequence: lead card, connection path, relationship explainer, source evidence, timeline strip, and case-packet save.
- **Relationship Explainers**: Entity connections now show why they exist, how many source documents support them, what the confidence looks like, and where provenance is missing.
- **Ranked Connection Paths**: Investigators can inspect bounded, ranked graph paths between entities instead of relying on a single giant graph view or one shortest path.
- **Document Context Drill-Down**: Source documents can now open with indexed snippets, provenance status, entity context, confidence, and direct “open source” actions.
- **Case Packet Capture**: Iceberg findings can be saved into durable evidence-chain items so promising leads do not disappear after discovery.
- **Mobile Access**: Iceberg Intelligence is available from the mobile investigation tools drawer, preserving the same lead-to-proof workflow on smaller screens.

### Why It Matters

- The app now treats the knowledge graph as an investigative assistant, not just a visualization. It answers: what matters, who is connected, why we think that, what sources support it, and what still needs review.
- The first release is deliberately source-first and bounded for the 1.4M-document corpus: broad scans are precomputed or paginated, while user actions inspect focused slices.
- Findings are not presented as legal conclusions. The UI uses review state, confidence, provenance, source documents, and limitations to keep uncertainty visible.

## Version 20 History - User-Facing Feature Timeline

### 20.3.x - Better Reading, Review, and Archive Freshness

- **Unified Document Reader**: Clean Text, Raw OCR, Original PDF, and Side-by-Side modes now live in one view switcher, making long source review faster and less disorienting.
- **Deep-Linkable Reading State**: Document view mode is preserved in the URL, so investigators can share or return to the exact reading mode they were using.
- **AI Insights Drawer**: Key insights and extracted entities are consolidated into a cleaner document-side drawer, reducing duplicate panels and making source review calmer.
- **Safer Annotation Menus**: Floating annotation controls now stay inside the visible viewport, preventing clipped menus during document review.
- **Current Archive Snapshot**: The public dashboard snapshot reflects 713,123 claim triples, 315,332 refined documents, 1,383 financial transactions, and 314 pipeline timeline events.

### 20.2.x - Faster Media Review and Tagging

- **Authenticated Media Editing**: Photo and video tagging, people assignment, rotation, risk rating, and batch edits now use the same protected write flow.
- **Batch Review Feedback**: Bulk media actions show clear success and partial-failure summaries instead of silently hiding failed updates.
- **Tag and People Workflow**: Reviewers can explicitly add or remove tags/people in batches, with improved people search for large archives.
- **Cleaner Reviewer Experience**: Non-admin users can browse and filter by tags without seeing edit controls they cannot use.
- **Keyboard Media Review**: Modal shortcuts make repeated tagging, rotation, navigation, and info-panel review faster.

### 20.1.x - Evidence, Timeline, Mobile, and Modal Polish

- **Reliable Modal Navigation**: Closing document and entity modals now returns users to the underlying page instead of walking through a long accidental history stack.
- **OCR Backfill Visibility**: The app now handles documents whose OCR exists but was not present in list previews, avoiding false “extraction pending” states.
- **Deduplicated Evidence Lists**: Documents mentioned multiple times by the same entity no longer clutter evidence lists with duplicates.
- **Media Evidence Previews**: Visual evidence cards now show inline thumbnails so investigators can recognize images and videos without opening every item.
- **Better Evidence Titles**: Media and document cards pull clearer titles from file metadata and source paths instead of showing generic IDs.
- **Evidence Modal Cleanup**: Evidence headers, black book links, dates, file names, and collection labels are easier to scan.
- **Timeline Restoration**: Timeline dots, pills, spacing, and typography were restored for more comfortable chronological review.
- **Mobile Document Improvements**: Mobile document/entity views use compact selectors and remove duplicated headers so more of the source stays visible.
- **Forensic Profile Popovers**: Dense forensic profile blocks moved behind on-demand popovers, reducing page clutter while keeping detail accessible.

### 20.0.x - Source-First Investigation Foundation

- **Investigation Readiness**: v20 established the reliability baseline for source-first investigation work, with cleaner entity switching, safer modal state, and stronger evidence surfaces.
- **Review Queue Refresh**: Review queues can be refreshed directly, making uncertainty and follow-up work easier to manage.
- **Evidence Chain Integrity**: Chain integrity now reflects actual custody chain data rather than a placeholder score.
- **Cleaner Public Pages**: About-page and evidence-modal copy were tightened so the app reads more like an archive and less like an internal build.
- **Stronger Shared Contracts**: Public data surfaces were made more predictable, reducing the chance that an entity, document, or evidence view fails mid-investigation.

## 19.9.0 - 2026-04-28 - Security Hardening & Breach Remediation

### Security & Infrastructure

- **Breach Remediation**: Successfully purged a cryptojacking miner and malicious package dependencies identified on the production server.
- **Dependency Hardening**: Upgraded Next.js and core dependencies to patched, secure versions to prevent supply chain attacks (dependency confusion).
- **Secrets Rotation**: Performed a full rotation of all production secrets (JWT, Session, Database) following an environment leak.
- **Nginx Security**: Implemented a global security policy at the gateway level to explicitly block access to hidden sensitive files (e.g., `.env`).
- **File System Permissions**: Enforced strict `600` permissions on all environment files and audited service account privileges.

### API & Stability

- **Subjects Route Restoration**: Restored the `/api/subjects` endpoint directly in the core application router to eliminate 404/504 regressions and stabilize the landing page entity directory.
- **Deployment Stability**: Hardened the deployment pipeline with automated environment sanity checks and improved process management reliability.

## 19.8.0 - 2026-04-28 - Immersive Mobile Document Experience

### Immersive Forensic Upgrades

- **Mobile Reading Mode**: Transformed the Document Viewer into a first-class, immersive mobile reading experience. Interface chrome (headers, tabs, bottom bars) now auto-hides on scroll to maximize viewport real estate.
- **Glassmorphic Control Pill**: Implemented a floating, glassmorphic control pill providing immediate 1-tap switching between PDF, Clean Text, and Raw OCR modes on mobile.
- **Unified Liquid Pattern**: Standardized all legacy modals (`ArticleViewerModal` and `ChainOfCustodyModal`) to utilize the thumb-optimized `LiquidSheet` architecture for absolute consistency across the forensic mobile interface.
- **Smart View Routing**: Integrated intelligent contextual routing in the Document Viewer to automatically prompt and redirect users to the specialized Email Workspace when viewing email documents.

### Infrastructure Hardening

- **Server Health Repair**: Eliminated zombie node processes holding port 3002 open, permanently resolving 403/504 gateway timeout regressions on the `about.glasscode.academy` domain and ensuring all remote API/Frontend instances are fully operational.

## 19.7.6 - 2026-04-27 - The Spiritual Release (Strict Typing)

### The "Purge" (STRICT Typing Everywhere)

- **0-Error Certification**: Achieved a 100% green `pnpm type-check` (tsc) status across the entire codebase. This "spiritual release" signifies the final cleansing of all architectural toxins.
- **Universal `any` Purge**: Eliminated all `any` types, `as any` casts, and `z.any()` schemas. Replaced them with concrete DB row interfaces (`InvestigationRow`, `EntityRow`, etc.) and strict `Record<string, unknown>` patterns for dynamic data.
- **Mapper Hardening**: Rebuilt all server-side mappers (`stats`, `analytics`, `search`, `media`, `entities`, etc.) to be 100% strictly typed. Mappers now strictly validate inputs from the database and guarantee the shape of DTOs returned to the client.
- **Search DTO Decoupling**: Refactored the search system to use lightweight result DTOs, decoupling search results from full entity profiles and fixing a major architectural mismatch that previously caused runtime `undefined` risks.
- **Route Hardening**: Validated all major route handlers (`entities`, `investigations`, `activeLearning`, `search`, `stats`) against now-stricter mapper interfaces and database row types.
- **Shared Schema Purification**: Replaced all `z.any()` and `z.unknown()` with precise Zod inference in shared investigation and entity schemas.
- **Validation Consistency**: Synchronized the `validate.ts` middleware with the latest entity query filters, including red-flag index ranges and strict enum checks.

### Infrastructure & Quality

- **Production-Ready "Ship"**: The codebase has undergone a full "silent retreat" and hardening phase. All known type-level risks and "cheats" have been removed, making this the most stable and production-ready version of the archive to date.
- **CI/CD Alignment**: All quality gates (type-check, lint, build) are now enforced with maximum strictness, ensuring no "toxic" code can enter the production stream.

## 19.7.0 - 2026-04-27 - Entity Integrity & API Hardening

### Data Integrity & Validation

- **Canonical ID Normalization**: Implemented a centralized `parseEntityId` utility to enforce `BigInt` identifiers across all repositories (Evidence, Media, Entities), eliminating type-casting bugs and standardizing the backend interface.
- **Entity Tab Schemas**: Introduced strictly typed Zod schemas for all 7 entity tab endpoints (`/media`, `/flights`, `/documents`, etc.) in `src/shared/schemas/entityTabs.ts`.
- **Contract Enforcement**: Fortified `entityEvidenceRoutes.ts` with strict ID validation (returning safe 400s instead of 500s) and guaranteed response shapes.

### Observability & Testing

- **Structured Logging**: Added Pino structured logging to all entity tab endpoints, tracking `rowCount`, `durationMs`, and `canonicalId`, with dedicated warnings for empty media states and missing assets.
- **Data-Integrity Audits**: Shipped a new Playwright-based `data-integrity-audit.spec.ts` suite to assert database invariants through the API layer (e.g., verifying entities with `verifiedMedia` stats return actual media payloads).
- **Golden Path Resiliency**: Upgraded the `golden-path.spec.ts` tests to dynamically discover entities with broad data coverage across multiple tabs, preventing test fragility.

## 19.6.12 - 2026-04-27

### Forensic Data Model Fixes

- **CRITICAL**: Fixed document retrieval 500 error by correcting the forensic signals source join (migrated to `forensic_signal_evidence` table).
- **Schema Cleanup**: Removed legacy `source_source` and `source_ref_id` column references.

## 19.6.11 - 2026-04-27

### Forensic Data Model & Infrastructure

- **CRITICAL**: Fixed 500 Internal Server Errors on `/api/documents/:id` and `/api/investigations` by correcting forensic signals schema (migrated from `entity_ids` column to `forensic_signal_entities` join table).
- **CRITICAL**: Restored missing entity evidence by adding name-based fallback joins to Flights, Properties, and Media repositories, bypassing NULL foreign keys in legacy data.
- **Table Schema**: Corrected `properties` table name to `palm_beach_properties` in entity evidence queries.
- **Media Linking**: Integrated `entity_mentions` -> `document_id` join to automatically link 7,000+ photos to entities mentioned in source documents.

## 19.6.10 - 2026-04-27 - Desktop Navigation Alignment Fix

### Bug Fixes

- **Desktop Navigation**: Fixed a vertical alignment regression where navigation buttons would overflow their container or appear off-center. Explicitly reset browser-default button styles and enforced strict height constraints to ensure pixel-perfect alignment within the pill container.

## 19.6.9 - 2026-04-27 - Mobile Navigation & Document Access Hardening

### Bug Fixes

- **Mobile Navigation**: Unified mobile breakpoints to 768px across the design system to ensure the search sheet and bottom navigation work consistently on all mobile-sized devices, including large-screen phones and iPad mini.
- **Entity Card Interface**: Replaced the rigid 3x3 tab grid on mobile with a touch-optimized horizontal scroller. This saves vertical space, prevents content overlap, and fixes the tab indicator's horizontal positioning.
- **Document Access**: Portalled the `LiquidSheet` component for documents to ensure it always renders at the top of the stack and avoids layout clipping regressions.
- **Search Bottom Nav**: Fixed the search button in the bottom navigation bar by ensuring the `toggleMobileSearch` event is correctly handled and triggers the appropriate UI state.

## 19.6.8 - 2026-04-27 - Mobile Entity Header Overlap Resolution

### Bug Fixes

- **Mobile Entity Card**: Resolved a critical layout bug where the tab grid overlapped the content area on mobile viewports. By removing restrictive max-height constraints and allowing the header to expand naturally, we ensured that all 9 forensic tabs are fully visible and correctly push the content down within the scrollable Liquid Sheet.

## 19.6.7 - 2026-04-27 - Mobile Entity Card Scroll Recovery

### Bug Fixes

- **Mobile Entity Cards**: Restored background scroll locking through the shared sheet scroll-lock hook, constrained sheet drag behavior to the handle, and compacted the forensic header so overview content can scroll and remain usable on mobile.

## 19.6.6 - 2026-04-26 - Forensic Search Integrity & Smoke Test Stabilization

### Bug Fixes

- **Search Navigation**: Document titles and context snippets in the Evidence Search results are now clickable links, allowing direct navigation to the document viewer from any search match.
- **Deep-linked Passages**: Enabled clickable file links within the "Spatial Contexts" and "Culpability Passages" sections of entity search results, bridging the gap between entity discovery and source evidence.
- **Visual Polish**: Refined the circular search button geometry and fixed a layout regression where grid card rounding was leaking into the wrong children at specific breakpoints.

### Infrastructure

- **Test Stabilization**: Increased the smoke test timeout to 60s to accommodate heavy relationship analysis queries on the full 1.6M record dataset, ensuring consistent CI/CD reliability.

## 19.6.5 - 2026-04-25 - Search Integrity & UX Polish

### Bug Fixes

- **Search Navigation**: Resolved critical 404 errors when clicking on media, investigations, or articles in the global search results. These items now correctly route to their respective viewers instead of defaulting to a broken document page.
- **Vertical Alignment**: Refined the vertical centering of navigation labels and breadcrumbs with precision optical adjustments for a more balanced aesthetic.

### Improvements

- **Evidence Display**: Enhanced entity cards to show a "Verified Media" count and a dedicated media chip when assets are present, addressing requests for better visibility of non-audio evidence.
- **Breadcrumb Compactness**: Further optimized breadcrumb vertical space and alignment for improved information density.

## 19.6.4 - 2026-04-25 - Robust Asset Serving & System Hardening

### Improvements

- **Face Gallery Assets**: Standardized path resolution using canonical `resolveMediaPath` to ensure reliable serving of face crops and thumbnails across different database path formats.
- **Security**: Hardened asset serving with centralized data root validation.

## 19.6.3 - 2026-04-25 - Emergency ESM Fix & System Stability

### Bug Fixes

- **ESM Compatibility**: Fixed missing `.js` extensions in internal imports for Memory and Admin routes which caused production startup failures.
- **Service Initialization**: Corrected RevisionManager initialization sequence in the main app lifecycle.
- **Final UI Polish**: Verified entity card rounding and shadow logic for mobile-first grid consistency.

## 19.6.2 - 2026-04-25 - Final 404 Resolution & Face Gallery Assets

### 404 Remediation & Features

- **Face Gallery Fix**: Implemented a secure asset serving route `/api/faces/assets` and updated the gallery to fix 404s on face crops and thumbnails.
- **Admin Dashboard Stability**: Fully restored the Backups and Ingest Runs history by implementing the missing API endpoints and repository methods.
- **Service Recovery**: Final stabilization of API mounting to ensure all dark routes are consistently available.

## 19.6.1 - 2026-04-25 - 404 Elimination & API System Completion

### API & Data Integrity

- **System-wide 404 Remediation**: Resolved all identified broken API links across the platform.
- **Media Endpoint Standardization**: Unified singular/plural media routes and transitioned to the `/stream` endpoint for all Audio/Video assets for improved playback performance.
- **API System Mounting**: Fully integrated the Memory, Data Quality, and Audit Log systems into the main application router.
- **New Audio Thumbnail Endpoint**: Implemented a server-side handler for audio asset thumbnails to restore broken gallery previews.
- **Hardcoded URL Removal**: Replaced absolute `epstein.academy` URLs with origin-relative paths to ensure portability across different deployment environments.

### Administrative Tools

- **Restored Audit Logs**: Fixed the missing `/api/admin/audit-logs` endpoint and mapped database records to the client-side forensic viewer.
- **System Health Restoration**: Re-enabled the System Health and Ingestion History reporting by mounting the corresponding stats and vitals routes.

## 19.6.0 - 2026-04-25 - Forensic Interface Refinement & Data Integrity Hardening

### UI & UX Polish

- **Refactored Entity Card Grid**: Removed the extraneous container box. Corner rounding is now applied per-card using complex `nth-child` logic (1, 2, and 3-column aware) so the cards themselves form a cohesive rounded block.
- **Nav Item Vertical Centering**: Corrected the vertical alignment of navigation labels with precision offsets to ensure perfect optical centering with icons.
- **Compact Breadcrumbs**: Significantly reduced the vertical height of breadcrumbs and aligned them with the main content boundaries to prioritize investigative data.
- **Evidence Overview Media Preview**: Added a "Verified Media" preview section to the Evidence Overview tab, providing immediate visual access to extracted assets.

### Media System Hardening

- **Endpoint Singularization**: Updated the client to use singular `/api/media/video/` and `/api/media/images/` to match the server's routing scheme, resolving 404s on asset retrieval.
- **Thumbnail Reliability**: Corrected `normalizeEntityMediaItem` to ensure video thumbnails are fetched via the correct media-specific endpoints.
- **Category Filtering Fix**: Resolved a bug in the Media tab where "Photos" and "Videos" categories failed to filter correctly due to singular/plural mismatches in file type checks.

### Database & Server Integrity

- **Financial Schema Alignment**: Fully migrated the `intelligenceRepository` from `financial_items` to the modern `financial_transactions` schema with explicit `from_entity` and `transaction_type` mapping.
- **Entity Identity Normalization**: Unified database queries to use `full_name` as the canonical entity identity column across the `intelligenceRepository`.
- **Evidence Mapping Hardening**: Fixed the mapping of "High Significance Evidence" in the Evidence Modal to ensure document IDs and filenames are always reliably populated.
- **Claim Triples Refinement**: Updated the intelligence repository to support verified status checks and standardized predicate naming (`predicate` vs `predicate_text`).
- **Stats & Graph Reliability**: Fixed data mapping for relationship strength and stats aggregation queries in the PostgreSQL query layer.

## 19.5.6 - 2026-04-24 - Search Button Margin Polish

### UI & UX Polish

- **Search Button Clearance**: Refined the search button geometry to ensure it sits perfectly within the search box borders with a consistent 1px-2px margin on all sides. This prevents any visual overlap with the pill-shaped container's border, resulting in a cleaner, more professional forensic aesthetic.

## 19.5.5 - 2026-04-24 - Search Box Integrity & Centering Fix

### UI & UX Polish

- **Search Box Container**: Re-engineered the search box by moving the pill-shaped background and border to the outer container. This guarantees that the search button and clear button are visually contained within the pill.
- **Nav Item Vertical Centering**: Corrected the vertical alignment of navigation labels with a negative vertical nudge to lift labels into the true optical center.

## 19.5.4 - 2026-04-24 - Perfect Pill & Alignment Refinement

### UI & UX Polish

- **Perfect Search Pill**: Forced the desktop search bar into a perfect pill shape by upgrading CSS specificity and enforcing maximum border-radius. This ensures absolute consistency with the integrated search button.
- **Nav Text Centering**: Refined the vertical centering of navigation labels across all tabs. Applied a precision vertical nudge to ensure perfect baseline alignment with forensic icons.

## 19.5.3 - 2026-04-24 - Forensic Interface Polish

### UI & UX Refinement

- **Breadcrumb Alignment**: Fixed breadcrumb left-alignment to perfectly match the logo and content edges. Added equal top and bottom padding for balanced vertical spacing.
- **Desktop Navigation Verticality**: Centered navigation labels and icons vertically within the desktop nav pill, resolving baseline offset issues.
- **Mobile Menu Optimization**: Significantly reduced vertical whitespace in the mobile slide-out menu header, search field, and footer, maximizing screen real estate for investigative content.
- **Nav Bar Alignment**: Aligned the desktop navigation bar's left and right edges with the main content boundaries and logo for a more structured, high-fidelity layout.

## 19.5.2 - 2026-04-24 - Desktop Search Polish

### UI & UX

- **Desktop Search Pill**: Refined the main search bar to a perfect pill shape with improved border-radius.
- **Search Button Integration**: Enlarged the yellow search button to fit neatly inside the pill with a precise 1px margin, providing a more integrated and premium feel.
- **Clear Button Alignment**: Adjusted the "Clear" button positioning to maintain consistent spacing with the new larger search button.

## 19.5.1 - 2026-04-24 - Navigation Polish & Mobile Consolidation

### Mobile UX & Layout

- **Unified Search & Filters**: Consolidated separate mobile buttons and sheets into a single, high-fidelity "Search & Filters" interaction. The unified button now provides a live summary of active search terms and date windows.
- **Header Alignment**: Horizontally aligned the logo and the menu button in a single row on mobile, reclaiming vertical space.
- **Enhanced Mobile Menu**: The mobile drawer now slides in from the right, layers over the entire UI (including the header), and supports a natural swipe-to-close gesture.
- **Bigger Brand Presence**: Increased the mobile logo font size for better legibility and visual weight.
- **Breadcrumb Spacing**: Significantly reduced vertical margins for breadcrumb navigation to prioritize data and charts above the fold.

### Desktop Navigation

- **Proportional Expansion**: Refactored the desktop navigation menu to fill the entire horizontal track while maintaining button widths proportional to their internal content.

---

## 19.5.0 - 2026-04-23 - Intelligence Workbench & Evidence Export Hardening

### Evidence Export

- Promoted evidence packet export into a first-class forensic bundle: `manifest.json` with deterministic evidence inventory, SHA-256 checksum, export limits, and per-file skip reasons.
- Added `evidence.csv` for reviewer-friendly spreadsheet inspection.
- Added `timeline.json` with investigation timeline events.
- Added `annotations.json` when evidence annotations are present.
- Added `README.md` inside the ZIP documenting bundle structure and integrity verification steps.
- Hardened ZIP export safety: null-byte stripping, data-root path confinement, symlink escape protection, size/file caps, and explicit skip-reason tracking (`path_traversal`, `file_not_found`, `size_limit`, `symlink_escape`, `not_a_file`, `duplicate_path`, `file_limit`).
- Added shared Zod schema (`exportManifestSchema`) for the export manifest contract.
- Made the investigation export panel a real download experience with JSON packet generation, authenticated ZIP downloads, progress, success, failure, filename, export-limit, and skipped-file feedback.

### Semantic Discovery

- Added Keyword, Conceptual, and Hybrid search controls to the Document Browser.
- Wired Conceptual and Hybrid document searches through the semantic search repository when pgvector embeddings are available.
- Added visible semantic status messaging so users know when conceptual search is active versus safely falling back to keyword search.
- Added per-result match badges in the Document Browser so analysts can distinguish text, conceptual, hybrid, and entity-context matches.
- Preserved legacy search links while standardizing backend mode values to `lexical`, `semantic`, and `hybrid`.

### Investigation Workbench

- Added a case readiness panel to investigations with evidence, timeline, hypothesis, annotation, provenance, and export-readiness signals.
- Improved empty investigation and empty evidence states with clear next actions into case folders, document search, and export tools.
- Exposed the evidence packet exporter in the mobile investigation export/report flow.

### Quality

- Added 19 unit tests covering manifest checksum determinism, CSV quoting, manifest ordering, and path traversal regression.
- Added Playwright API tests for the export endpoint: 401 guard, 404 guard, ZIP structure, manifest shape, and export determinism.
- Improved `/api/subjects` responsiveness for common “top subjects” browsing by introducing a bounded fast path and safer query behavior.
- Hardened Timeline UI date parsing with a safe fallback when data contains invalid dates.
- Prevented Vite dev-server ENOSPC file-watcher crashes by ignoring large local dataset directories (pipeline checkpoints/runs, data).
- Rolled out Zod-based request validation across all core routes (Financials, Flights, Timeline, Black Book, Media, Emails) to eliminate runtime type inconsistencies and harden the API surface.
- Implemented production-ready smoke tests with real endpoint probes for health, readiness, and public statistics.
- Added degraded-state fallback logic for the `/api/stats` endpoint to ensure system observability even during database initialization or query timeouts.
- Restored clean local `type-check`, `lint`, and production build gates for the v19.5 workstream.

---

## 19.4.2 - 2026-04-23 - UI Reconciliation & CI/CD Restoration

### UI & UX

- **Search Input Reconciliation**: Shipped a systematic fix for search input padding to prevent placeholder text from overlapping leading icons.
- **Global CSS Sibling Rule**: Implemented a universal CSS "catch-all" rule in `index.css` that detects icon-preceded inputs and applies correct forensic padding automatically.
- **Design System Specificity**: Increased CSS specificity for the DS `SearchField` component to ensure it overrides global baseline styles on complex pages.

### CI/CD & Infrastructure

- **Playwright Pipeline Fix**: Restored the production bundle smoke test suite in GitHub Actions by adding automated Playwright browser installation to the CI and deployment workflows.
- **Quality Gate Alignment**: Successfully verified all production verification scripts and bundle smoke tests against the v19.4.2 build.

---

## 19.4.1 - 2026-04-22 - Stability: Observability Hardening

### Server Observability

- Added explicit logging for previously silent failure paths (JWT verification failures; JSON parse fallbacks in Black Book, Timeline support, and Evidence metadata).
- Added debug-level logs for AI enrichment best-effort fallbacks (keeps behavior unchanged while restoring visibility when enabled).

---

## 19.4.0 - 2026-04-22 - System Hardening & Release Readiness

### Infrastructure & Stability

- **Architecture Hardening**: Upgraded CI and verification scripts (`verify_ops`, `check_client_server_boundary`) to be environment-agnostic and resilient to missing system binaries.
- **Ingestion Resilience**: Resolved `DOMMatrix` and `pdf-parse` runtime blockers for Node v20 compatibility, ensuring stable asset extraction across all environments.
- **Unified Pipeline Tracking**: Fully migrated the Ingest Runs infrastructure and UI to the modern `pipeline_runs` unified tracking system.
- **Relational Integrity**: Successfully completed a 59-step strict relational migration, enforcing referential integrity and performance-optimized junction tables across the core forensic data layer.

### Project Hygiene

- **Repository Sanitization**: Performed a full sweep of stale logs, temporary artifacts, and historical handovers to achieve a production-grade repository state.
- **Hardened Git Configuration**: Improved `.gitignore` rules to permanently exclude local environment and scratch artifacts.
- **Documentation Migration**: Centralized investigative reports into the formal documentation hierarchy.

---

## 19.3.2 - 2026-04-19

### Media Browser

- Added a PDF asset extraction endpoint and UI trigger so extracted photos populate the global Media Browser (Extracted Media album).
- Fixed per-document “Recovered Assets” fetch by supporting `documentId` filtering on `/api/media/images`.
- Removed layout overflow sources causing horizontal scrolling in the Media browser.

---

## 19.3.1 - 2026-04-18

### Mobile Overlays & Onboarding

- Fixed Mobile “More” menu toggle and restored reliable interaction.
- Standardized scroll locking to the actual app scroll container, restoring scroll within mobile overlays/sheets.
- Made mobile overlays render as full-screen, scrollable sheets with safe-area padding.
- Ensured the First Run Onboarding overlay always stacks above the footer.

---

## 19.3.0 - 2026-04-18

### Archival Hardening & Relational Integrity

- **Strict Relational Migration**: Completely replaced polymorphic associations and array-based columns (`BIGINT[]`, `UUID[]`) with explicit junction tables and foreign key constraints for `investigation_collaborators`, `forensic_signals`, and `audit_log`.
- **Fuzzy Identity Fusion**: Upgraded the `IdentityFusionService` to support trigram-based fuzzy matching (threshold > 0.85) and phonetic similarity, significantly improving subject resolution across disparate datasets.
- **Semantic Discovery Core**: Implemented the database foundation for conceptual search using `pgvector`, enabling high-performance semantic similarity queries for documents and entities.
- **Forensic Provenance UI**: Launched a new "Liquid Glass" Provenance Panel that visualizes the evidentiary trail behind a risk score or signal, ensuring full investigative transparency.
- **Repository Optimization**: Refactored the core investigation, forensic, and data quality repositories to utilize the new strict relational architecture.

---

## 19.3.0 - 2026-04-17

### Mobile UX

- Fixed Email Client layout on narrow/tablet widths by removing impossible minimum pane widths and ensuring list panes measure/scroll correctly.
- Fixed Investigation mobile overlays/sheets (consistent modal z-index, responsive widths/heights, and reliable scrolling inside the mobile shell).

### UI Stability

- Fixed the shared icon registry to include all referenced icons (prevents runtime icon lookup failures).
- Hardened offline indicator state handling (correct initial state, correct reconnect dismissal timing).

---

## 19.2.0 - 2026-04-17

### Media & Forensic Extraction

- Implemented a sharp-based text-detection heuristic (entropy + stdev analysis) to automatically flag OCR-heavy scanned document pages.
- Focused the Media Browser on photographic evidence by defaulting to "Hide Archival Scans" for a cleaner investigative gallery.
- Added a "Show Archival Scans" toggle to the Photo Browser to allow viewing raw document extracts when needed.
- Integrated a new **"Recovered Assets"** tab into the Document Modal, providing direct access to photos extracted from the specific document being reviewed.
- Enhanced relational data integrity by linking all extracted assets directly to their source `document_id`.

---

## 19.1.17 - 2026-04-17

### Mobile UX

- Made entity cards and entity dossier modal header mobile-first (smaller padding/typography; titles wrap instead of truncating; reduced media overlay padding).
- Made document browser and document viewer mobile-first (no modal width overflow near 768px; scrollable toolbars; disabled hover-only previews on touch; responsive annotation panels).

---

## 19.1.16 - 2026-04-17

### Document Viewer

- Fixed DOJ “Original Document” proxying by setting the required `justiceGovAgeVerified=true` cookie on upstream requests (prevents age-gate HTML responses and restores file access where local corpus is missing).

---

## 19.1.15 - 2026-04-17

### Document Viewer

- Fixed missing corpus resolution by trying both `data/...` and `...` relative paths against the mounted corpus roots (eliminates `/data/data/...` mis-resolve and reduces 404s).
- Prevented proxy fallback from serving DOJ age-gate HTML as if it were a document payload.

---

## 19.1.14 - 2026-04-17

### Document Viewer

- Fixed remaining 404s for DOJ-ingested paths by deriving and proxying the matching justice.gov URL when the local corpus file is missing.

---

## 19.1.13 - 2026-04-17

### Document Viewer

- Fixed remaining 404s for “Original Document” by proxy-streaming whitelisted remote source URLs when no local asset path exists.

---

## 19.1.12 - 2026-04-17

### Document Viewer

- Fixed “Original Document” viewing by serving the best available file variant when a dirty/original path is missing.
- Prevented intermittent 500s when attempting to send non-file paths from `/api/documents/:id/file` (now verifies regular files and surfaces send errors consistently).

---

## 19.1.11 - 2026-04-16

### Document Viewer

- Fixed PDF rendering under strict CSP by initializing a module worker via `workerPort` (prevents worker import fallback).
- Migrated document viewer search fields to DS `SearchField` to prevent icon/placeholder overlap.

---

## 19.1.10 - 2026-04-16

### PDF Viewer

- Fixed PDF rendering under strict CSP by bundling the PDF.js worker locally (no external CDN worker).

---

## 19.1.9 - 2026-04-16

### Document Viewer

- Fixed document modal loading by preventing null `initialDoc` from poisoning the query cache (restores `/api/documents/:id` fetch on open).

---

## 19.1.8 - 2026-04-16

### Document Viewer

- Fixed deep links and full-page navigations to `/documents/:id` so the document modal reliably opens on first load.

---

## 19.1.7 - 2026-04-16

### Document Open Fix

- Fixed document opening from evidence flows by preferring canonical document identifiers over evidence-row IDs.

---

## 19.1.6 - 2026-04-15

### Email Workspace Styling

- Shipped latest mailbox/thread visual refinements and spacing polish updates.

---

## 19.1.5 - 2026-04-15

### Email Workspace Styling

- Polished mailbox VIP highlighting and refined thread header/subheader spacing for consistency.

---

## 19.1.4 - 2026-04-15

### Email Workspace

- Fixed desktop layout so the message pane is always visible (mobile-only pane toggling no longer hides the third column on desktop).
- Increased horizontal padding for conversation totals and thread counts for consistent spacing.

---

## 19.1.3 - 2026-04-15

### Release Hygiene

- Removed lingering native interactive elements from the client by adding a DS `Range` primitive and adopting it where needed.
- Standardized slider styling to design tokens for consistent focus/track/thumb behavior.
- Cleaned up docs and tooling lists to avoid references to removed legacy files.

---

## 19.1.2 - 2026-04-15

### Black Book UI

- Restored DS-consistent padding on Black Book cards.
- Fixed search icon/placeholder overlap by migrating to DS `SearchField`.
- Improved thumbnail picking to prefer tagged entity face crops when available.

---

## 19.1.1 - 2026-04-15

### CI, Type Safety, and Deploy Readiness

- Cleared all CI lint warnings and TypeScript errors across client and server.
- Removed remaining `import.meta` `any` usage in API status/unavailable surfaces.
- Fixed strict typing issues in repository utilities and black book ID filtering.
- Refined property map loading flow to avoid set-state-in-effect lint regressions.
- Preserved lazy import reliability while keeping chunk retry logic lint-clean.
- Finalized deploy gate requirements for `release_notes.md` and shipped patch release.

---

## v19.1.0 - 2026-04-15 — Full Design System Migration

Completes the design system migration across the entire client codebase. Every raw `<button>`, `<select>`, `<textarea>`, and text/file `<input>` element has been replaced with DS primitives, establishing a single, token-governed UI layer with no ad-hoc native form elements remaining outside the design system itself.

### Design System

- **Complete form element migration**: All `<button>` → `Button`, `<select>` → `Select`, `<textarea>` → `Textarea`, `<input type="text/email/number/password/search">` → `TextInput`/`SearchField`, `<input type="file">` → `FileInput` across ~190 component files
- **New DS primitives**: Added `FileInput`, `Input` (migration wrapper), `TextArea`, and `NativeSelect` components to the design system with full token support
- **FileInput component**: New `FileInput.tsx` + `FileInput.css` with `::file-selector-button` styling via DS tokens, following the `BaseFieldProps` density/size pattern
- **Zero raw form elements**: Verified with grep — no unmigrated form elements remain anywhere in `src/client/` outside the design system implementation itself

### Infrastructure

- Excluded `.pnpm-store` from Prettier to prevent false-positive parse errors during pre-flight QA

---

## v19.0.4 - 2026-04-14 — Responsive UX Unification & Release Hardening

This patch unifies complex mobile workflows with the broader product shell so email, investigation, panels, and overlays feel like one reliable system across desktop and handheld use.

### UX & Design System

- **Responsive email workspace**: Removed the parallel mobile email product surface and routed all email workflows through the shared responsive client, reducing UX drift between breakpoints
- **Shared sheet/modal behavior**: Rebuilt the mobile email filters and investigation capture/add flows on top of shared dialog, button, and input primitives for consistent spacing, focus handling, accessibility, and motion
- **Investigation panel consistency**: Reconnected the memory and leads panels to governed module styling so side surfaces align with the current design language instead of older ad-hoc presentation patterns
- **Browser reliability**: Fixed the file preview modal's Download action so it now performs a real download instead of presenting a dead-end CTA
- **Release governance**: Hardened the design-token audit script so release verification no longer fails on deleted legacy files, making the production gate more trustworthy

---

## v19.0.3 - 2026-04-13 — Design System Consolidation

Completes the design system primitive consolidation across all UI components, eliminating ad-hoc styling in favour of centralized DS tokens and layout primitives.

### Refactor

- **DS Consolidation**: Migrated all remaining components to design system primitives — buttons, inputs, selects, and layout containers now consistently use DS-managed tokens
- **CSS Specificity Hardening**: Resolved input padding specificity conflicts by doubling class selectors `(.cls.cls)` to (0,2,0), beating the global baseline `input[type='text']` at (0,1,1)

---

## v19.0.2 - 2026-04-13 — Design System Specificity Fixes

Fixes three CSS specificity regressions introduced by the DS consolidation refactor, where DS Button attribute selectors (`(0,3,0)`) silently won over consuming component module classes (`(0,1,0)`).

### Bug Fixes

- **Toast close button**: restored intended `1.5rem × 1.5rem` size — the DS `[data-size='sm'][data-icon-only]` rule was overriding the `.closeBtn` override to 2rem
- **Mobile menu close button**: restored transparent background — the DS secondary variant was winning over the module's `background: transparent`
- **Flight tracker passenger select**: added `size="sm"` to match all other filter selects (was defaulting to `md`, 44px)

---

## v19.0.1 - 2026-04-12 — Systematic Layout & Design System Hardening

This patch standardizes the application's layout primitives and form controls, ensuring pixel-perfect consistency across all investigative surfaces.

### UI & Layout Standardisation

- **Global Baseline Hardening**: Implemented a global CSS baseline for all native `select`, `input`, and `textarea` elements. This ensures consistent 36px/44px heights and Liquid Glass styling even in legacy components.
- **Evidence Search Refactor**: Migrated the Evidence Search filters to official Design System components, resolving title/badge overlaps and alignment clumping.
- **Breadcrumb Alignment**: Added standard vertical margins to the breadcrumb navigation to prevent content clumping with page headers.
- **Design System Expansion**: Added `size="sm"` support to the `Select` component for compact forensic toolbars.

## v19.0.0 - 2026-04-12 — Mobile-First UX Overhaul & Media Browser Hardening

This major release delivers a comprehensive mobile-first redesign across five core investigation pages, adds touch gesture support throughout, and fixes functional bugs in the media browser.

### Mobile UX Overhaul

- **Network Graph (D3 force graph)**: Added pinch-to-zoom via Touch Events API, single-finger pan, initial state lazy-initialization (no flash of incorrect layout), `collapsedWidth=0` on mobile so the settings panel fully collapses, and CSS hiding of desktop-only controls at ≤767px.
- **Timeline**: Modal rows stack to single-column on narrow viewports; filter/sort buttons get 44px minimum touch targets; sticky header loses negative margin overflows on mobile; event card and timeline padding reduced for small screens.
- **Analytics**: Removed `max-height: 85vh` constraint on the network section so it doesn't clip on mobile; hid slider, timeline, and path-mode controls that require hover/precision input; reduced viz panel padding.
- **Flight Map**: Full pointer-events pan and pinch-zoom using `setPointerCapture` for reliable cross-device drag tracking. The map transforms via CSS `translate + scale` on a wrapper div (no SVG mutation). A "Reset view" button appears conditionally when the transform is non-identity.
- **Flights tab bar**: View-mode labels (Timeline, Map, Stats, Network) are hidden on ≤480px via `viewTabLabel` CSS class — icons remain, saving horizontal space.
- **People page**: Filter wrap shrinks to full-width on very narrow viewports; toolbar wraps gracefully.

### Media Browser Fixes

- **AudioBrowser — setState during render (React violation)**: Removed the `containerWidth` state that was being set inside the AutoSizer render callback (`setContainerWidth(width)`). React 18 flags this as "Cannot update a component while rendering a different component", causing an extra render cycle and a visible layout jump on load. Refactored: `columns` is now computed as a plain variable inside the AutoSizer callback (same pattern as `VideoBrowser` and `PhotoBrowser`). Converted the inline `Row` closure to a standalone `AudioRow = React.memo(...)` component using react-window's `itemData` prop, eliminating all closure-captured state.
- **PhotoBrowser — list row selection variant bug**: In `ListRow`, both branches of the selection ternary returned `'glass-highlight'` — selected and unselected rows were visually identical in list view during batch mode. Fixed: unselected rows now use `'glass-strong'`.

## v18.8.6 - 2026-04-11 - Evidence Navigation Restoration & SQL Optimization

This release restores visibility for high-volume entity evidence and hardens the archival media browsing interface with premium "Liquid Glass" refinements and technical sorting fixes.

### Evidence & Scaling

- **High-Volume Restoration**: Resolved a critical data retrieval failure for high-exposure entities (e.g., Jeffrey Epstein, ID 1). Implemented a CTE-based SQL optimization that guarantees document uniqueness and reliable pagination for collections exceeding 111,000 records.
- **BigInt Standardization**: Unified ID handling across the repository and API layer to prevent precision loss and ensure consistent archival retrieval.
- **Natural Sort Implementation**: Enabled "Human" sort fallback for testimony documents (e.g., Sascha Barros Parts 1-6), ensuring they appear in logical numeric sequence instead of chronological/lexicographical order.

### Media & UI Refinement

- **Archival Media Stability**: Fixed a bug where empty media sets returned 204 status codes, crashing the frontend. Resolved media type detection regressions for robust integrated playback of forensic audio and video.
- **Improved Scroll Affordance**: Increased the media browser height to 750px (approx. 2.25 rows) to provide a clear visual cue that content continues below the fold.
- **UI Decluttering**: Purged redundant archival metadata chips (e.g., `#PROV-VERIFIED`) from document cards to improve scannability.
- **Liquid Glass Aesthetics**: Integrated high-fidelity blurred background layers and glass-surface refinements across the media exploration suite.
- **Zero-Error Standard**: Achieved 100% build hygiene by resolving all residual linting and formatting warnings in the core investigation workspace.

## v18.8.5 - 2026-04-11 - Documentation Sync & Version Alignment

This release synchronizes the archival version history with recent mobile investigation features and maintains UI stabilization across viewports.

### Documentation & History

- **Mobile Investigation Suite Enrichment**: Retroactively updated the v18.8.0 history to accurately reflect the launch of the Mobile Investigation Shell, Evidence Capture Sheet, and Forensic Workbench.
- **Version Alignment**: Unified the local development baseline with the production deployment cycle.

## v18.8.4 - 2026-04-11 - UI Decluttering & Stabilization

This release focuses on streamlining the header and mobile layouts by removing redundant stat chips that duplicated information found in the primary dashboard cards.

### UI & Layout

- **Header Simplification**: Removed the redundant "People", "Mentions", and "Files" chips from the desktop header. This declutters the top navigation area and puts more focus on the branding and search tools.
- **Mobile Stabilization**: Purged the redundant mobile stats grid. This ensures a more consistent experience across devices, as these metrics are already prominently displayed on the main dashboard.
- **Code Hygiene**: Cleaned up the associated count-up animations and CSS modules, resulting in a slightly leaner application payload.

## v18.8.3 - 2026-04-11 - Integrated Media Playback & Browsing

This release significantly enhances the archival media experience by introducing category-based sub-navigation and immersive integrated players for Photos, Video, and Audio evidence.

### Media & UX Enhancement

- **Sub-Tab Navigation**: Added persistent sub-navigation within the Media tab to filter content by **Photos**, **Videos**, and **Audio**. This allows for faster identification of signal-rich evidence.
- **Integrated Forensic Players**: No more raw file views in new tabs. Clicking any media item now opens an immersive integrated player:
  - **Audio**: Uses the forensic signal log with live waveform visualization and synchronized transcripts.
  - **Video**: Employs the high-fidelity archival video player with support for chapters and metadata.
  - **Photos**: Features a premium glassmorphic image viewer.
- **Live Metadata Enrichment**: The integrated players now automatically fetch and display forensic transcripts and chapters upon selection, ensuring full archival context is always available during investigation.

### UI & Styling

- **Glassmorphic Navigation**: Implemented themed sub-tab controls that align with the Liquid Glass design language.
- **Immersive Overlays**: Optimized player backdrops and loaders for a focused, evidence-first exploration experience.

## v18.8.2 - 2026-04-10 - Evidence Data Restoration & Query Optimization

This critical hotfix restores visibility for high-exposure entities by optimizing the underlying evidence retrieval engine and hardening the investigation suite's document browsing interface.

### Evidence & Performance

- **Query Optimization**: Completely refactored the `getEntityDocumentsPaginated` engine. By replacing expensive `GROUP BY` operations on large text columns with a streamlined `DISTINCT ON` approach, response times for high-profile entities (e.g., Jeffrey Epstein) have been reduced from 1500ms+ to <50ms.
- **Restored Evidence Visibility**: Resolved a regression where the Evidence tab would fail to render records for entities with significant document counts.
- **Hardened Empty States**: Upgraded the `EvidenceDocumentsTab` to handle edge-case loading failures gracefully. Replaced the blank container with a predictive "Syncing..." status to maintain UI continuity during high-lag archival fetches.

### Technical Hygiene

- **Type Safety**: Achieved 100% build hygiene by resolving remaining `any` type warnings in the Evidence Modal and Network Visualization components.
- **Deployment Resilience**: Synchronized production deployment keys and bypassed local environment conflicts to ensure immediate hotfix availability.

## v18.8.1 - 2026-04-10 - UI Hardening & Natural Sorting

This patch release hardens the media browsing experience with human-readable sorting, improved scroll affordance, and global layout stability across the investigation suite.

### Media Browser & UX

- **Human-First Sorting**: Implemented natural sorting for media assets. Numbered series (e.g., "Sascha Barros Testimony Parts 1-6") now appear in their correct logical sequence rather than lexicographical order.
- **Scroll Affordance**: Calibrated the media browser height to 680px (approximately 2.25 rows) to provide a clear visual cue that content continues below the fold.
- **Blurred Thumbnail Aesthetic**: Upgraded sensitive media placeholders to a high-fidelity glassmorphic design, using 40px background blurs of the actual assets to maintain aesthetic continuity.
- **VIEW Link Fix**: Corrected a regression where media "VIEW" buttons triggered raw JSON API responses; links now correctly resolve to high-resolution asset files.

### Global Layout & Stability

- **Box-Sizing Hardening**: Implemented a global `box-sizing: border-box` reset to prevent padding-induced layout overflows and ensure predictable component geometry.
- **Close Button Alignment**: Resolved a visual regression where the "What's New" dialog close button overran the panel boundaries.
- **Header Geometry**: Refined the Release Notes panel header and footer for perfect pixel alignment within the Liquid Glass design system.

## v18.8.0 - 2026-04-10 - Forensic Portraits & Mobile Investigations

This release introduces the standardized Forensic Portrait system and launches the comprehensive **Mobile Investigation Suite**, enabling full investigative capabilities and case management on-the-go.

### Mobile Investigation Suite

- **Mobile Investigation Shell**: A dedicated, high-fidelity workspace for mobile devices (`MobileInvestigationShell`). It provides a seamless transition from desktop, with persistent case state and tabbed tool access.
- **Evidence Capture Sheet**: Introduced a gesture-driven capture interface for rapid evidence tagging and archival linking while in the field.
- **Mobile Board & Timeline**: Optimized the investigation board and chronology views for small viewports, ensuring evidence maps and event sequences remain legible and interactive.
- **Forensic Workbench**: Integrated communication analysis, hypothesis testing, and forensic metadata tools into a responsive mobile environment.

### Forensic UI & Portraits

- **Forensic Portrait System**: Implemented a canonical entity portrait API (`/api/entities/:id/portrait`) that prioritizes high-fidelity face crops from the forensic detection pipeline.
- **Dossier Enrichment**: Integrated forensic portraits into the Subject Dossier Panel, providing a visual pivot point for entity metrics and document analysis.
- **Unified Identity**: Updated Person and Subject cards across the "Leads" and Search interfaces to utilize standardized forensic zoom shots, improving subject recognition speed.

### Media Browser Hardening

- **Audio Browser Stability**: Fixed a rendering regression where audio recordings would fail to appear upon tab activation; refactored to use `AutoSizer` for robust viewport calculations.
- **Standardized Search Interface**: Migrated legacy search inputs in the Audio and Video browsers to the unified Liquid Glass `SearchField` design system primitive.
- **Layout Spacing Harmony**: Corrected vertical spacing and button alignment across all three media tab headers (Audio, Video, Photo) for consistent UX.

### Archival Integrity

- **Sascha Riley Verification**: Confirmed and verified the successful backfill of the Sascha Riley TikTok Q&A collection and associated forensic albums.
- **Environment Sync**: Synchronized local development configurations with the latest production baseline.

## v18.7.0 - 2026-04-10 - Media Visibility & Archival Preservation

This release resolves critical gaps in the media library, enabling full visibility for archival image collections, and hardens the search interface for forensic speed.

### Media Visibility & Archival Gaps

- **Image Gallery Promotion**: Fixed a long-standing ingestion gap where images were excluded from the media library. All archival evidence images (e.g., Sascha Riley adoption papers, receipts) are now promoted to the gallery.
- **Entity Linking Accuracy**: Refactored the media search API to correctly join with the `media_item_people` junction table, ensuring all tagged media (including face cluster results) appears in an entity's direct photo feed.
- **Sascha Riley Preservation**: Finalized the backfill for the Sascha Riley TikTok and associated forensic images, ensuring 100% visibility for the collection.

### Visual Hardening

- **Search Row Standardization**: Migrated the Photo Browser header to Liquid Glass design primitives, ensuring pixel-perfect 32px alignment and uniform spacing across all filter controls.
- **Headshot Prioritization**: Upgraded entity profile pictures to prioritize detected face crops over full-media thumbnails for faster suspect identification.

## v18.6.0 - 2026-04-10 - Archival Hardening & Liquid Glass Standardization

This minor release bundles significant "Hardening" improvements across the investigation suite, purifies the entity directory from archival noise, and completes the standardization of visualization surfaces using Liquid Glass tokens.

### Archival Hardening & Data Integrity

- **Junk Entity Purge**: Improved the entity extraction filter to automatically identify and suppress email header fragments, salutations, and role-based labels (e.g., "From:", "Hi Jeffrey", "professor", "original message").
- **Robust Relationship Joins**: Fixed type-casting mismatches in the media linking SQL logic, ensuring persistent associations between entities and forensic assets.
- **Dossier Precision**: Denormalized mention and evidence counts on the primary entity listing to ensure accurate, high-speed sorting.

### Investigation Suite & Visualizations

- **Typed Forensic Reporting**: Upgraded the Report Generator with explicit schema interfaces and localized source tracking for more accurate evidence mapping.
- **Standardized Surface tokens**: Integrated Liquid Glass design tokens (`--accent-info`, `var(--nav-flights)`, etc.) into the Network Graph and entity cards to eliminate visual drift.
- **UI Spacing Polish**: Refined toolbar geometry and flex-alignment on the People page for better viewport accessibility.

### Technical & Quality

- **Zero-Warning Hygiene**: Verified a clean production build with 100% pass rates on linting, type-checking, and automated smoke test suites.
- **Rollback Safety**: Hardened the deployment pipeline with pre-migration Postgres backups and chunk-cache compatibility for zero-downtime serving.

## v18.5.1 - 2026-04-10 - Production Hardening & People Page Restoration

This maintenance release finalizes the v18.5.0 migration by resolving critical data filtering logic, unifying toolbar layouts on the People page, and achieving a zero-warning TypeScript baseline for the Investigation Suite.

### Forensic Restoration (People Page)

- **VIP Filtering Fix**: Corrected the "VIP Only" filter to accurately target the `is_vip` database column, restoring visibility for high-value entities.
- **Unified Toolbar**: Refactored the People page toolbar with flexbox to ensure perfect vertical alignment between metadata, filter dropdowns, and sort controls.
- **Empty State UX**: Added a contextual "Clear All Filters" reset to the "No Results" view, improving the investigator recovery path.

### Type-Safety & Stability

- **Zero-Warning Hardening**: Resolved 9 critical TypeScript errors and 80+ linting warnings, including schema mismatches in the `entities` repository (synchronized `likelihood_score` → `risk_level`).
- **Infrastructure Sync**: Synchronized `pnpm` versioning between GitHub Actions and `package.json` to ensure stable CI/CD pipeline runs.
- **Liquid Glass Alignment**: Hardened toolbar geometry with `!important` tokens to prevent design system overrides and standardized icon baselines.

## v18.5.0 - 2026-04-10 - Iconic Typography & Forensic Restoration

This major release elevates the archive's visual identity with a high-impact **"Iconic & Bombastic"** typographic system, restores critical analytical tools, and achieves a zero-error production baseline for the "Liquid Glass" architecture.

### User-Facing Changes

- **Iconic Typography**: Integrated **Space Grotesk** and **Outfit** as the primary display fonts, delivering a modern, high-contrast intelligence aesthetic.
- **Bombastic Headlines**: Introduced massive scaling and tight tracking for case headers, ensuring the investigation workspace feels definitive and high-stakes.
- **Symbolic Metadata**: Updated HUD and forensic labels with wide-tracked uppercase mono variants for enhanced scanability.
- **Investigation Restoration**: The **Signal Intelligence** (Analytics) tab is now fully functional, featuring a live Network Visualization engine for evidence mapping.
- **Import Forensic Records**: Restored the "Import Data" modal and portal, enabling high-speed JSON/PDF migration flows directly from the workspace.

### Technical & Stability

- **Zero-Error Certification**: Cleared all remaining TypeScript and linting regressions, achieving an absolute zero-error status for production build and deployment.
- **Design System Alignment**: Standardized all `Flex`, `Box`, and `Surface` component props to match the strict Liquid Glass governance baseline.
- **Production Build**: Verified the production bundle generation pipeline with a 100% pass rate.

## v18.4.0 - 2026-04-06 - Media Browser Stability & Sascha Album Release

This minor release fixes the media browser tab chrome, hardens image and video thumbnail handling, and promotes the Sascha TikTok into its own browsable video album while restoring a clean lint, typecheck, and formatting baseline across the repository.

### Media Browser

- **Tab Chrome Cleanup**: Removed the stray white divider under the media browser tabs for a cleaner gallery header.
- **Thumbnail Reliability**: Corrected media route MIME handling so thumbnails are served with their real file types instead of inheriting the source media MIME.
- **Video Memory Stability**: Stopped video thumbnail fallbacks from serving full video files to image tags and tightened client video teardown to release timers and media resources when switching items.

### Sascha TikTok Album

- **Dedicated Video Album**: Created and backfilled a standalone `Sascha Riley TikTok Q&A` video album so the TikTok appears as its own media collection in the browser.
- **Future Ingest Support**: Updated the ingestion pipeline to create and sync media album entries for audio and video documents automatically, including the Sascha TikTok source collection naming.

### Release Quality

- **Repo Cleanliness**: Verified the repository is passing ESLint, Prettier, and TypeScript checks with the current release state.

## v18.3.4 - 2026-04-03 - Liquid Glass Stabilization

This maintenance release achieves a 100% clean, zero-warning codebase for the "Liquid Glass" architecture, ensuring full compatibility with the React Compiler and strengthening core type safety.

### Architecture & Type Safety

- **Zero-Warning Compliance**: Resolved all residual `any` type warnings and manual memoization failures across the entire repository.
- **Hook Optimization**: Standardized `useCallback` dependency arrays in `VideoPlayer.tsx` and `App.tsx` to satisfy strict React Compiler requirements.
- **Interface Hardening**: Replaced all `any` casts with concrete interfaces (`ReportEntity`, `ReportSection`, etc.) in `ForensicReportGenerator.tsx` and `EvidenceAnnotation.tsx`.
- **Script Stabilization**: Modernized all utility and ingestion scripts with typed error handling and removed legacy `@ts-ignore` suppressions.

### Release Quality

- **Production Health**: Verified with a complete audit of the Postgres storage engine and automated smoke tests.
- **UI Performance**: Eliminated layout flicker and state-sync regressions in the Document modal and global search popover.

## v18.3.3 - 2026-04-02 - Subject Dossier Patch

This patch fixes the Subject Dossier Panel (Investigator view) being clipped by the site header and adds Escape key support for easier dismissal.

### Bug Fixes

- **Subject Dossier**: Fixed `z-index` layering (`z-40` → `var(--z-modal)`) to correctly overlay the global header.
- **Accessibility**: Added Escape key support to the investigation dossiers using `useModalFocusTrap`.

## v18.3.2 - 2026-04-02 - UI Layering & Accessibility Hotfix

This hotfix ensures all overlays and modals correctly appear above the site header and adds global "Escape" key support for dismissing dialogs.

### UI / UX

- **Layering Fix**: Standardised `z-index` scale; overlays (search, date pickers, modals) now consistently cover the sticky header.
- **Escape Dismissal**: Added keyboard support to `DocumentModal`, `EvidenceModal`, `MobileMenu`, and global search popovers.
- **Standardised Tokens**: Refactored hardcoded z-indices to use theme variables (`--z-header`, `--z-dropdown`, etc.).

## v18.3.1 - 2026-04-02 - Performance & Visibility Hotfix

This patch resolves "archived" investigations not appearing on the site and optimizes subject listing performance on the production database.

### Bug Fixes

- Fixed status mapping mismatch (now handles `active` status correctly)
- Populated missing `uuid` field for existing investigations
- Optimized subject listing from **1.3s** to **<50ms** by denormalizing mention/evidence counts

### Performance

- Added indexes on `investigations(owner_id, status)` and `investigations(updated_at)`
- Added index on `investigation_leads(investigation_id)`
- Refreshed Postgres statistics on 1.3M+ record tables

## v18.3.0 - 2026-04-02 - Investigator-Grade Case Management

This release formalizes the investigation system into a professional-grade case management platform, with the Vladislav Doronin investigation as the inaugural litmus test.

### What's New for Users

**Leads Tracker**

- New **Leads** panel in the investigation workspace for tracking open investigative threads
- Status workflow: `open → pursued → resolved` (or `dead end`) with one-click cycling
- Priority levels: `critical / high / medium / low` with colour-coded badges
- EFTA document cross-references link directly to source DOJ records
- Leads auto-populated on report import

**Subject Dossier Panel**

- New **Subject** panel for entity-centric investigation views
- Shows Red Flag Index score, mention count, known aliases, and linked documents
- Pin any entity as a primary subject of the investigation
- Search the full entity database directly from the panel

**Import Report (Universal Ingestor)**

- New **Import Report** button and modal in the investigation workspace header
- Paste any standardised Markdown report to auto-populate: evidence (EFTA resolution), timeline events, hypotheses, and leads
- Idempotent — safe to re-import updated reports without creating duplicates
- CLI: `npx tsx scripts/ingest-investigation.ts <file.md>`
- API: `POST /api/investigations/import-report`

**Vladislav Doronin Investigation**

- Fully formalised investigation now live in the archive
- 11 DOJ source documents linked, 23 timeline events populated
- Thesis: Doronin as the Epstein–Trump Russian bridge, via Capital Group, Aman Resorts, and shared Kremlin-adjacent networks

### Technical

- New `investigation_leads` table with full CRUD API (`GET/POST/PATCH/DELETE /api/investigations/:id/leads`)
- `InvestigationIngestorService` — universal Markdown parser with EFTA auto-resolution
- `docs/investigation-report-format.md` — canonical specification for investigation reports

## v18.2.1 - 2026-04-01 - Hotfix: Restore Tailwind CSS

This patch restores Tailwind CSS which was accidentally removed in the Autumn cleanup commit.

### Bug Fixes

- Restored `tailwind.config.js` and `postcss.config.js`
- Updated `index.css` to use Tailwind 4's `@import "tailwindcss"` syntax
- Installed `@tailwindcss/postcss` and `@tailwindcss/vite` packages

## v18.2.0 - 2026-04-01 - Pipeline Intelligence & Telemetry

This release adds comprehensive telemetry to the intelligence pipeline, fixes critical attachment extraction bugs, and implements entity blacklist enforcement during ingestion.

### What's New for Users

**Pipeline Telemetry**

- Real-time metrics collection for entity extraction including total mentions, unique entities, and entities by type
- Blocked entity tracking to monitor junk entity filtering effectiveness
- Credentials and contacts extracted count displayed in pipeline summary
- Live status file enriched with full metrics for monitoring dashboards

**Blacklist Enforcement**

- Integrated `ENTITY_BLACKLIST_PATTERNS` and `ENTITY_PARTIAL_BLOCKLIST` into the intelligence pipeline
- Entities matching blocklist patterns are now filtered during extraction, not after
- Blocked entity counts tracked for quality monitoring

**Attachment Pipeline Fixes**

- Email attachments are now properly extracted and stored during ingestion
- Attachments are recursively processed as separate documents with proper parent linkage
- Attachment directory organization using SHA256 hashing for deduplication
- `data/attachments/{sha256-hash}/` structure enables duplicate detection

### Bug Fixes

- Fixed attachment extraction never running due to `_attachments` never being assigned
- Fixed attachment directories using `undefined` as path due to missing `_emailSha256` assignment
- Fixed multiple catch blocks silently ignoring errors without any logging

### Under the Hood

- Added `PipelineAudit` class for comprehensive error aggregation
- Error categorization enables targeted troubleshooting (overlay_inference, email_metadata_parse, etc.)
- pHash failure tracking for image quality monitoring
- All catch blocks now record errors to the audit log

## v18.1.1 - 2026-03-31 - Network Graph Fixes & UI Polish

This patch release restores network graph edge visibility, fixes data mapping in the Evidence modal, and improves the Document Browser layout for better mobile and desktop consistency.

### What's New for Users

**Network Graph Improvements**

- **Edge Visibility**: Restored connection lines between entities in the Network tab that were previously missing due to a data mapping error.
- **Dynamic Lineweights**: Connection lines now feature variable thickness based on relationship strength (1px to 3.5px), providing immediate visual feedback on the significance of links.
- **Improved Contrast**: Boosted edge opacity and refined colors for better legibility against the dark "Liquid Glass" background.

**UI & Layout Polish**

- **Document Browser Padding**: Added balanced horizontal margins to the Document Browser, fixing a regression where text was clipped or too close to the viewport edges on both mobile and desktop.
- **Evidence Overview Responsive Grid**: Standardized the statistical metrics grid in the Evidence Overview tab to a responsive 4-column layout on desktop, resolving a 1x1 stacking issue.
- **Media Tab Grid**: Optimized the Media tab's responsive grid breakpoints to ensure a professional 3-4 column layout triggers correctly on desktop displays.
- **Virtualized List Calculation**: Fixed a height calculation issue in the Evidence modal content area, ensuring that virtualized lists (Evidence tab) correctly render their items by providing a stable flex container.

### Bug Fixes

- Fixed a data mapping mismatch where relationships were provided with `source`/`target` keys instead of the required `sourceId`/`targetId` for graph rendering.
- Corrected an `items-center` CSS typo in `EvidenceModal.module.css`.

## v18.1.0 - 2026-03-30 - Document Provenance, Search Fixes & Liquid Glass Completion

This release ships document provenance tracking, fixes search correctness issues, and completes the Liquid Glass CSS Module migration across the remaining UI components.

### What's New for Users

**Document Provenance**

- Each document now exposes a **Provenance Panel** showing source collection, credibility score, OCR engine and quality score, acquisition method, source system, and source release.
- A **lineage view** surfaces the full event history for a document — every ingest, enrichment, and correction step is now visible in the Evidence modal.
- Historical records have been backfilled with provenance data via a migration and backfill pass.
- Entity name search is now significantly faster thanks to a new trigram index (`044_entities_trigram_index`).

**Global Search**

- Search results now feature color-coded category badges with improved density and legibility.
- Sort and filter controls have been refactored for more consistent behavior across result types.

**Visual Polish (Liquid Glass completion)**

- `About`, `Analytics`, `MemoryDashboard`, `FAQPage`, `DataQualityDashboard`, `SearchFilters`, `SortFilter`, `Footer`, `MobileMenu`, `BatchToolbar`, `AddToInvestigation`, `TagSelector`, `LoadingPill`, `ErrorBoundary`, `ToastProvider`, `AlbumSidebar`, `MediaBrowserLayout`, `SensitiveWarningBanner`, `DegradedBanner`, and `LegalPage` are now fully migrated to CSS Modules.
- Z-index scale and danger/warning colour tokens added to the design token system.
- `AddToInvestigation` now uses React state for toast notifications instead of direct DOM manipulation.
- `BatchToolbar` now uses React refs instead of `querySelector` for element targeting.

### Bug Fixes

- Fixed search repository type errors and non-uniform return structures that caused CI failures and potential runtime inconsistencies in search results.
- Fixed provenance migration rollback: the `down` function now correctly drops all added columns.
- Fixed `MemoryDashboard` using a hard-coded `ring-green-500` class instead of the CSS variable equivalent.

### Under the Hood

- CSS Module ratchet extended to 24 governed files — raw Tailwind utilities in migrated components will now fail CI.
- `documentProvenanceService` added alongside a new `/api/documents/:id/lineage` endpoint.
- `dataQualityRepository` updated with provenance-aware data quality checks.
- Search repository refactored to localise types and enforce strict return structure, resolving namespace resolution failures in CI.

---

## v18.0.0 - 2026-03-28 - Liquid Glass UI Overhaul & Routing Stability

This major release delivers the "Liquid Glass" design system, standardizing the application's aesthetic across all core modules while significantly improving navigation stability and interface performance.

### What's New for Users

**Liquid Glass Design System**

- **Standardized Surfaces**: All panels, cards, and control clusters now utilize the high-performance `.surface-glass` utility, providing a deep, consistent depth effect with optimized backdrop-blur rendering.
- **Enhanced Visualization**: The Network Analysis graph and Case Folder views have been restyled for better legibility and a more premium, professional aesthetic.
- **Improved Density**: Refined spacing and visual hierarchy across all search and browsing interfaces (Documents, Evidence, Media).

**Navigation & Stability**

- **SPA Routing Fixes**: The global Footer and main navigation paths have been fully migrated to React Router components, eliminating full-browser reloads and preserving application state during browsing.
- **Search Precision**: Document and evidence search inputs now feature improved focus states and more consistent behavior across the dashboard.

### Under the Hood

- Standardized UI tokens integrated into `src/client/index.css` to eliminate CSS drift.
- Pre-flight routing and UI synchronization tests added to the Playwright suite.
- Clean-up of 50+ instances of legacy Tailwind glass utility classes.

---

## v17.2.0 - 2026-03-23 - Flights, Properties, Evidence UI & Pipeline Hardening

This release ships three new first-class UI slices, a full `any`-free TypeScript pass, a correctness fix for entity sort ordering, and significant pipeline and server resilience improvements.

### What's New for Users

**Flights explorer**

- New `/flights` section with a full flight tracker, map view, timeline view, network graph, stats header, and detail panel.
- Flight cards surface passenger manifests, tail numbers, origin/destination airports, and date ranges.

**Properties browser**

- New `/properties` section with browse, analytics, and associates views.
- Property cards link to associated entities and surface ownership and visit history.

**Evidence search improvements**

- Evidence results now render with a dedicated card layout including document snippets, filter controls, and a result card with provenance and redaction indicators.
- Evidence filters support type, date range, and entity scoping.

**Legal page**

- New `/legal` route with terms and privacy content, accessible from the footer.

**Routing overhaul**

- App shell migrated to nested `<Routes>` / `<Route>` with `useMatch`-based active tab detection, replacing the previous manual pathname comparison.
- Flights, Properties, Evidence, and Legal routes are now first-class lazy-loaded entries.

### Bug Fixes

- Fixed entity sort-by-mentions using a stale denormalized `entities.mentions` column instead of a live count from `entity_mentions`. All sort paths (mentions, red_flag, risk, document_count, recent tiebreakers) now use correlated subqueries against the live table.
- Fixed document sort: date/title/size/red_flag sort paths now use a dynamic `ORDER BY` clause with correct column expressions and parameter binding, replacing a broken `CASE`-based approach that silently fell through to the default.
- Fixed `purgeCache` → `purgeCacheByPattern` call site in the app server after the cache middleware API changed.

### Under the Hood

- Complete `any`-free TypeScript pass across the entire codebase — zero `any` casts, zero TS errors.
- Shared API types extracted to `src/client/types/api.ts`; inline interface duplication removed from `App.tsx` and other consumers.
- Sentry integration added (`src/server/services/sentry.ts`); `initSentry()` called at app startup, `sentryErrorHandler` wired into the Express error chain.
- AI enrichment and pipeline timeouts are now configurable via environment variables (`EXO_DISCOVERY_TIMEOUT_MS`, `AI_REQUEST_TIMEOUT_MS`, `PIPELINE_DOC_TIMEOUT_MS`, `PIPELINE_STALL_TIMEOUT_MS`, etc.) with safe defaults.
- Pipeline watchdog added with configurable stall detection, per-service recovery commands, and cooldown logic.
- VIP entity lookup now degrades gracefully on Postgres statement timeout, returning a cached result rather than propagating the error.
- CORS dev origins expanded to include ports 4173 and 5173 for Vite preview and dev server compatibility.
- `deepCamelKeys` middleware removed from the app server (was already handled at the route/mapper layer).
- Documents trigram index migration added (`043_documents_trigram_index.sql`) for faster full-text search.
- Test hygiene checker and junk entity consolidation script added to the scripts directory.
- Design token strict baseline updated.

---

## v17.1.1 - 2026-03-23 - Dossier UX & Navigation Polish

This patch tightens a few high-visibility UI and data issues that showed up immediately after the 17.1.0 rollout.

### What's New for Users

**Cleaner dossier browsing**

- Entity dossier navigation now stays aligned with the page content width instead of shrinking around its labels.
- The entity profile modal now loads evidence and linked media more reliably, including fallback handling when the primary evidence feed is sparse or inconsistent.

**More legible relationship views**

- Network views now render larger nodes with persistent labels, which makes the relationship canvas easier to scan without constant hovering or zooming.

**Softer interface treatment**

- Several hard white card borders in the dossier and network UI were replaced with a softer glass outline that matches the search field treatment more closely.

---

## v17.1.0 - 2026-03-23 - Stability, Investigations & Production Confidence

This release packages the user-facing work that landed after v17.0.0 into a single minor update. It focuses on making the archive more reliable in daily use while keeping the new design system and platform hardening intact.

### What's New for Users

**More resilient analytics and visual exploration**

- Analytics views now share a typed interaction context, which makes cross-panel selection and filtering more consistent across treemap, network, and enhanced analytics experiences.
- Visualization surfaces now fail more gracefully: route maps, timelines, entity graphs, and related interactive views show contained fallback states instead of breaking the page when a malformed record appears.

**Stronger investigation and evidence workflows**

- Investigation exports and related integrity checks were tightened so exported evidence and timeline data stay aligned with the typed app model.
- Document and evidence browsing benefited from a broader strict-typing pass, reducing edge-case UI failures when records contain sparse or uneven metadata.

**Better production reliability**

- Production quality gates now cover database migration readiness, stricter SQL/query parity checks, and broader client token-compliance scanning before deploys proceed.
- Post-deploy verification was refined so the Epstein deployment path validates the correct public properties while still supporting full cross-site health checks for the wider site network.

### Under the Hood

- End-to-end strict typing was extended across both client and server codepaths, including route handlers, repositories, DTO mappers, visualizations, and shared context plumbing.
- CI and production workflows now run Postgres migrations before the unified quality gate, reducing false negatives and making local and remote verification paths match more closely.
- Public-site verification scripts now support targeted suites as well as full-network checks, making it safer to verify deploy health across all managed sites.

---

## v17.0.0 - 2026-03-20 - Design Overhaul, Data Quality & Platform Hardening

This release completes a full cycle of platform improvements begun in v16.0. The archive looks and performs substantially differently from where it started — new visual identity, a cleaner people directory, faster search, improved sharing, and a significantly more robust backend.

### What's New for Users

**Redesigned visual identity**

- New typography: IBM Plex Sans for UI text, DM Serif Display for editorial headings, IBM Plex Mono for code and identifiers.
- Archival amber accent (`#d4a84b`) replaces the previous cyan throughout — tab indicators, search, focus states, card titles on hover.
- Solid, opaque surfaces replace the glass-morphism aesthetic: darker, cleaner, faster to render.
- Risk scale simplified to three visual bands (critical/high → deep red, medium → goldenrod, low → green) for faster at-a-glance reading.
- Sharper border radii and tighter header height give the interface more density without feeling cramped.

**Cleaner people directory**

- Removed 1,658 phantom entities that were being extracted from document phrasing rather than real people — salutations ("Dear Donald Trump"), legal role prefixes ("Defendant Ghislaine…"), possessive role descriptions ("Jeffrey Epstein's Housekeeper"), and video link text ("Watch Jeffrey Epstein"). The people directory now surfaces actual individuals.
- Ingest pipeline updated to block these patterns from re-entering the database on future document processing runs.

**Improved sharing & discovery**

- Media item and album deep links now generate correct Open Graph preview images and titles when shared on social platforms or messaging apps.
- New high-intent landing pages for search engine discovery: `/epstein-documents`, `/epstein-people`, `/epstein-media`, `/epstein-timeline`, `/epstein-flights`, `/the-epstein-files`.

**Session continuity**

- Refreshing the page no longer logs you out. The app now silently restores your session from the refresh cookie without requiring a manual re-login.

**Investigation workspace**

- New investigations are now created under your own user account rather than a hardcoded placeholder account.

### Under the Hood

- All API responses standardised to camelCase — eliminates a long-running inconsistency between routes.
- Evidence search loads associated people in a single batch query instead of one query per result.
- Token refresh is now atomic (transaction + row lock), preventing concurrent tab refreshes from creating duplicate live tokens.
- Removed unauthenticated static file handler for `/data`; all document access now routes through the audited path-traversal-protected handler.
- Full structured logging via `pino` across all server code; zero `console.log` calls remaining in production paths.
- Zero TypeScript errors, zero ESLint errors. Clean Vite build.

---

## v16.9.0 - 2026-03-19 - Production Readiness Hardening

### Security

- Removed hardcoded `JWT_REFRESH_SECRET` from PM2 ecosystem config; all secrets now loaded exclusively from the remote `.env`.
- Untracked `.env.production` and `.env.audit` from Git; broadened `.gitignore` to blanket-exclude `.env.*` except `.env.example`.
- Added `CORS_ORIGIN` to the `env_production` PM2 block to prevent empty-origin misconfiguration.

### Observability

- Added `pino-http` structured access logging for all HTTP requests (health probes excluded).
- Migrated 120+ `console.error/warn/log` calls across server code to the structured `pino` logger.
- Global error handler now emits structured JSON logs with request context, PG metadata, and pool stats.

### Reliability

- Added `process.on('unhandledRejection')` and `process.on('uncaughtException')` safety nets in the server entry point.
- Graceful shutdown now force-closes lingering HTTP connections after an 8-second grace period, preventing stale requests from blocking deploys.
- Added `process.send('ready')` for PM2 `wait_ready` integration.
- API response cache is now automatically purged after any successful write operation.

### Deployment

- Added `pg_dump -Fc` pre-migration backup step to the deploy pipeline.
- Rollback procedure updated to Postgres `pg_restore --clean --if-exists`.

### Database

- Ran pending schema sync migration (entities.needs_review, entities.manually_reviewed, evidence.original_file_path, articles.link unique index, investigation_evidence unique constraint).
- Ran `red_flag_score` column migration.

### Verification

- Zero TypeScript compiler errors and zero ESLint errors across the full codebase.

## v16.8.0 - 2026-03-19 - Error Fixes, Security Hardening & Deployment Refresh

### Bug Fixes

- Fixed malformed imports in `relationshipsRepository`, `emails-optimized`, and `graphRoutes` that caused ESLint parsing failures
- Added `unhandledRejection` and `uncaughtException` safety nets to the server entry point

### Security

- Removed hardcoded `JWT_REFRESH_SECRET` from `ecosystem.config.cjs`; secrets must now live in the remote `.env` file
- Tightened `.gitignore` to blanket-exclude all `.env.*` variants except `.env.example`

### Deployment

- Upgraded deploy rollback path to Postgres `pg_dump`/`pg_restore`
- Added pre-migration `pg_dump` backup step to the deploy pipeline
- Added `CORS_ORIGIN` to the production PM2 env block

### Verification

- Confirmed zero TypeScript compiler errors and zero ESLint errors across the full codebase
- Confirmed clean Vite production build (3,248 modules, no warnings)

## v16.7.0 - 2026-03-19 - UI Polish & Design System Cleanup

### UI / UX

- Reduced header height from ~72px to ~55px (tighter padding, smaller stat numbers)
- Fixed nav labels truncating: "Investigate" → "Cases", "Black Book" → "Blackbook"
- Removed broken tooltip on Subjects nav tab (was clipped by overflow-hidden container)
- Eliminated toast storm on server-down: removed two background-API error toasts that stacked on load

### Design System

- Added missing CSS tokens: `--glass-border-highlight`, `--bg-elevated`, `--border-subtle`, `--type-xs`
- Fixed `BaseCard` malformed Tailwind class (`hover:shadow-[var(--shadow-[...])]` → `hover:shadow-[var(--glass-shadow)]`)
- Fixed `BaseCard` undefined token: `--accent-primary` → `--accent`
- Replaced hardcoded `text-[10px]`/`text-[9px]` in `PersonCard` with `text-[var(--type-xs)]`
- Replaced hardcoded px values in DocumentCard styling with design tokens
- Replaced 4-level ternary toast class logic with clean CSS utility classes (`.toast-success`, `.toast-error`, etc.)

## 16.6.0 - 2026-03-17 - Humanistic Design Refactor

### Visual Design

- Replaced ambient radial gradient blobs on the page body with a clean flat dark background (`#0a0a0b`).
- Swapped Inter for **IBM Plex Sans** (body/UI) and added **DM Serif Display** as a display typeface for editorial contexts; IBM Plex Mono replaces JetBrains Mono.
- Replaced cyan accent (`#33a8ff`) with archival amber (`#d4a84b`) across tab indicators, search button, focus outlines, and card hover titles.
- Domain accents desaturated: docs → deep editorial red, emails → steel-blue, investigations → measured purple, evidence → teal.
- Risk scale collapsed from 6 saturated colours to 3 visual bands: deep red (critical/high), dark goldenrod (medium), forest green (low/minimal).
- Border radii sharpened: `8/12/16px` → `4/6/8px`.

### Glass-morphism Removal

- `.glass-panel`, `.glass-card`, `.glass-surface` converted to opaque solid surfaces (`#15151a`); backdrop-filter and `--glass-shine` pseudo-element removed.
- Card and control hover states no longer apply `translateY` lift.
- Document cards: solid background, no blur, no lift on hover; `.document-card::before` radial glow and `.preview-glow` deleted.
- Blur preserved only on justified overlay elements: sticky header, dropdowns, header search pill.

### Footer

- Brand name gradient clip-text replaced with DM Serif Display plain white.
- Column headings (`Mission`, `Support`, `Network`) changed from uppercase+icon to a quiet `border-l` label style.
- Status indicator pulsing animation removed.

### Tabs

- Tab labels: uppercase + heavy tracking removed; `font-weight: 500`, `text-transform: none`, `letter-spacing: 0.02em`.
- Tab indicator glow (`box-shadow`) removed.

### Card Component

- Decorative gradient icon wrapper removed; icon rendered bare with `shrink-0` positioning.

## 16.5.0 - 2026-03-16 - API camelCase Standardisation & Risk Score Backfill

### API Contract

- All `/api` responses now return camelCase keys unconditionally. A global `deepCamelKeys` middleware on the Express router recursively transforms every response object before it is sent, eliminating the previous mixed state where some routes returned snake_case fields and others returned camelCase.
- Removed dual-field outputs (`evidence_types` + `evidenceTypes`, `red_flag_rating` + `redFlagRating`, etc.) from all entity and investigation DTO mappers.
- All shared DTOs (`src/shared/dto/`), Zod schemas (`src/shared/schemas/`), and the root `Person` / `SubjectCardDTO` interfaces (`src/types.ts`) updated to camelCase-only field names.
- Client components, hooks, services, and utilities updated across 50+ files to read camelCase properties exclusively.

### Risk Score Backfill

- Ran `scripts/recalculate_entity_risk.ts` to recompute risk scores for all 532,791 entities using the current `entityRisk-v1` algorithm; anchor score 250, Jeffrey Epstein normalised to 100/100.

### Bug Fixes

- Fixed `PersonCard` showing 0/5 risk rating: `EvidenceModal` was reading `entity.redFlagRating` but the mapper was emitting `red_flag_rating`; resolved by the global middleware.
- Fixed `GraphService.normalizeNode` reading stale `primary_role`, `top_photo_id`, `photo_url` properties; updated to `primaryRole`, `topPhotoId`.
- Fixed `InvestigationWorkspace` entity category fallback reading `entity.primary_role` instead of `entity.primaryRole`.

## 16.4.0 - 2026-03-15 - Security, Reliability & Pipeline Observability

### Security

- Removed unauthenticated `express.static('/data', ...)` handler; `/data/*` URLs now route through the same audited, path-traversal-protected handler as `/files/*`, preserving all document browser and download functionality.
- Token rotation endpoint (`POST /api/auth/refresh`) now uses a `BEGIN/COMMIT` transaction with `SELECT ... FOR UPDATE`, eliminating the race condition where concurrent refresh requests could produce two live tokens for the same session.
- Update schemas in investigations routes no longer use `.passthrough()`; unknown fields are stripped at validation time, preventing callers from injecting arbitrary DB columns via `updateInvestigation`, `updateTimelineEvent`, `updateHypothesis`, and `addEvidence`.
- `getCriticalTableCounts` now validates table names against an explicit allowlist before interpolating into SQL.
- User IDs now generated with `crypto.randomUUID()` instead of `Date.now()`, eliminating creation-timestamp disclosure and collision risk under concurrent admin requests.

### Reliability

- `recordWebVitals` call in vitals route is now fire-and-forget with an explicit `.catch()` logger; DB errors no longer become unhandled promise rejections on the hot vitals path.
- `createAlbumArchive` now registers an `archive.on('error', ...)` handler to cleanly destroy the response stream on mid-archive filesystem errors.
- People page fallback query path now runs the main entity query, count query, max-connectivity, and VIP lookup in a single `Promise.all`, reducing sequential DB round-trips from 4 to 1 parallel batch.

### Auth / UX

- `AuthContext` now attempts `POST /api/auth/refresh` on page reload when `/api/auth/me` returns no user, restoring session state from the refresh cookie without requiring a manual re-login.
- `InvestigationsContext` now uses the authenticated user's ID (from `AuthContext`) instead of the hardcoded `'1'` when creating investigations and populating the team lead field.

### Pipeline Observability

- AI Enrichment progress bar in the Übersicht desktop widget now displays real-time throughput (docs/s) and an ETA derived from elapsed time since `enrichStartedAt`, replacing the stale ingest-rate approximation.
- `unified_pipeline.ts` writes `enrichStartedAt` timestamp to `live_status.json` at the beginning of each enrichment run so the rate calculation survives widget and pipeline restarts.
- `get_stats.sh` passes `enrichStartedAt`, `enrichProcessed`, and `enrichTotal` from the status JSON through to the widget's merged output.

## 16.3.1 - 2026-03-12 - Server-Side Media Share Metadata

### Search & Sharing

- Added server-side Open Graph/Twitter meta rendering for `/media` deep links with `id`, `photoId`, or `albumId` query parameters.
- Media item links now return bot-visible OG tags and canonical URLs without requiring JavaScript execution.
- Album share links now attempt to use the first image in the selected album as the OG preview image.
- Preserved SPA fallback behavior if metadata enrichment fails, with safe no-cache headers for share endpoints.

## 16.3.0 - 2026-03-12 - SEO Intent Pages + Rich Metadata

### Search Engine Visibility

- Added high-intent landing routes for search discovery: `/the-epstein-files`, `/epstein-documents`, `/epstein-people`, `/epstein-media`, `/epstein-timeline`, and `/epstein-flights`.
- Added static prerendered HTML counterparts under `public/` for crawler-first indexing on those intent pages.
- Extended app SEO metadata with per-route title/description/keywords/canonical controls and route-specific structured data (`CollectionPage`, `Dataset`, `NewsArticle` where relevant).
- Added stronger internal linking from homepage fallback and footer to intent pages and high-value sections.
- Expanded sitemap coverage to include all new intent landing URLs for faster discovery across search engines.
- Added media share metadata behavior so media deep links and album links resolve OG images/canonical URLs with item/album-specific context.

## 16.2.1 - 2026-03-12 - SEO Crawlability Hardening

### Search Engine Visibility

- Added real `robots.txt` and `sitemap.xml` artifacts to the production build output so crawlers can discover and index core archive routes.
- Added default canonical URL, standard description meta tag, robots directives, Open Graph image alt text, and JSON-LD website metadata to the HTML shell.
- Added crawlable fallback HTML content and section links in the initial `#root` markup so non-JS and low-JS crawlers see meaningful page content.
- Enhanced runtime SEO tags in the `SEO` component with canonical normalization, robots directives, and JSON-LD page metadata.

## 16.2.0 - 2026-03-12 - Search Performance & Investigation Reliability

### Improvements

- Evidence search now loads associated people significantly faster — entity relationships are fetched in a single batch query instead of one per result
- Adding media or documents to an investigation is now atomic — if anything fails mid-operation, no partial records are left behind
- Sensitive content preference now resets when you close the browser tab, rather than persisting across sessions
- Fixed the analytics timeline chart returning 500 errors — column alias ordering bug in the underlying query

## 16.1.0 - 2026-03-12 - Database Reliability & Schema Sync

### Improvements

- Sentence discovery operations are now atomic — boilerplate and document sentence inserts commit together or not at all
- Database session settings now apply correctly on pool connection — previously some SET commands were silently dropped
- Pipeline mode validation now exits with a clear error on invalid arguments instead of proceeding with unexpected behavior
- Applied 3 schema migrations: file assets, document pages, and boilerplate phrases tables

## 16.0.2 - 2026-03-10 - Sascha Riley Entity + Media Linking

### Entities & Media

- **Canonical Profile Alignment:** Normalized Sascha profile handling so `Sascha Riley`/`Sasha Riley` aliases resolve consistently in ingestion and entity lookups.
- **Testimony Media Linking:** Linked all six Sascha testimony audio assets plus album cover image to the canonical `Sascha Riley` entity in media relations.
- **People Tag Reliability:** Added explicit `media_item_people` associations for testimony assets so they surface correctly in entity/media views and people filters.

## 16.0.1 - 2026-03-10 - Face Cluster Entity Linking

### Face Gallery

- **Entity Linking:** Face clusters can now be linked to canonical entities via an autocomplete search in the Face Gallery detail view.
- **Auto-tagging:** Linking a cluster automatically upserts all photos in that cluster into `media_item_people`, making them immediately discoverable via the PhotoBrowser "People" filter.
- **Link Badge:** Gallery cards show a cyan link indicator when a cluster is associated with an entity.
- **Unlink:** One-click unlink removes the entity association from a cluster.
- **Photo Count Toast:** Confirmation toast on link shows how many photos were tagged.

### Database

- Migration `1753600000000_face_cluster_entity_link`: adds `entity_id` FK column and index to `face_clusters`.

## 16.0.0 - 2026-03-10 - Full Ingestion Milestone

### Milestone

- **100% Ingestion Reached:** The tracked DOJ and media corpus has reached full ingestion coverage.
- **Phase Transition:** The pipeline focus now shifts from ingestion throughput to intelligence analysis, OCR quality reruns, and graph/entity refinement.

### About Page

- **Milestone Messaging:** Replaced "ingestion ongoing" copy with completion-aware language tied to live pipeline totals.
- **Status Banner Upgrade:** Ingestion dashboard now flips to a "Milestone Reached" state once aggregate target coverage is complete.
- **ETA Behavior Update:** ETA/throughput panel is hidden once ingestion completes and replaced with post-ingest intelligence-phase status messaging.
- **Roadmap Framing:** "Built for Future Releases" section now reflects a fully ingested baseline with ongoing intelligence work.

## 15.10.3 - 2026-03-10 - Enrichment Backfill Mode Stabilization

### Ingestion Pipeline

- **Backfill Mode Added:** `scripts/ingest_pipeline.ts` now supports `enrich-only` mode to enrich completed documents without touching queue leases.
- **Safe Pagination Fix:** Backfill iteration now uses `id > lastId` keyset pagination (not mutable `OFFSET`) to avoid skipping records while updates are applied.
- **Bounded Concurrency:** Processing now runs in fixed-size chunks with `Promise.allSettled`, keeping concurrency predictable and resilient to per-document failures.

## 15.10.2 - 2026-03-10 - Ingestion AI Text Cleanup Inclusion

### Ingestion Pipeline

- **Parallel AI Post-Processing:** The queue now runs wildcard-repair, OCR cleanup, and summary generation in one pass for ingested document text.
- **Conditional Metadata Update:** `metadata_json.ai_summary` is only written when summary output exists, while content fields are only updated when text actually changed.

### AI Enrichment

- **Deterministic Decode Pre-Pass:** Added HTML entity, numeric entity, unicode mojibake, ligature, and invisible-character normalization before MIME wildcard repair.
- **Chunked OCR Cleaner:** Added bounded chunk-level OCR cleanup (`max 5` chunks) with strict guardrails to reject unstable LLM output lengths.

## 15.10.1 - 2026-03-10 - Modal Header + File Route + API Contract Stabilization

### Document Modal UX

- **Find Input Spacing Fix:** Increased left input padding so `Find in record...` no longer overlaps the search icon.
- **Header Right Alignment:** Reduced right header padding so the close control sits closer to the modal edge.

### Original Document Reliability

- **Email File Route Hardening:** `/api/documents/:id/file` now ignores URL-like pseudo-paths and resolves only valid local file candidates.
- **Email Fallback Delivery:** When no local file exists for email records, the route returns an inline RFC822 `.eml` payload built from metadata/content instead of failing with invalid-path errors.

### API Stability

- **Subjects Timeout Fallback:** `/api/subjects` now falls back to a lighter query path on Postgres statement timeout, preventing 503s from heavy aggregation paths.
- **Audit Logging Compatibility:** `audit_log` writes now auto-detect legacy/modern schemas and never fail request paths.
- **Evidence DTO Normalization:** `/api/evidence/:id` now returns canonical document-detail fields required by shared DTO contracts.
- **Graph DTO Type Fix:** `/api/graph/global` now returns numeric `connectionCount` values (and numeric `risk`/`community`) for schema compliance.

## 15.10.0 - 2026-03-09 - Ingestion Snapshot + Document Browser Stabilization

### Pipeline Snapshot

- **Ingestion State Captured:** Added runtime snapshot at `backups/ingestion_snapshots/ingestion_snapshot_20260309_220536.json` with ingest run status, queue phase, current file, and unlock/crash indicators.
- **Dataset Totals Captured:** Snapshot includes current Postgres totals at capture time: 1,425,126 documents and 4,278,383 entity mentions.

### UI Reliability

- **Document Browser Build Fixes:** Resolved TypeScript and lint blockers in document browser list/header/filter integration so production build and deploy gates pass again.
- **List Rendering Cleanup:** Removed stale imports/state wiring that was causing CI-style no-unused-local failures during release build.

## 15.9.2 - 2026-03-08 - Pipeline Resume

### Infrastructure

- **Pipeline Tracking Tables:** Added `pipeline_runs` and `pipeline_steps` tables (migration 1753500000000) so the ingestion pipeline can resume on production after 20-day idle gap.

## 15.9.1 - 2026-03-08 - Civ-Style Mentions Board + About Status Accuracy

### Visualizations

- **Top Mentioned Individuals Rebuilt:** Replaced the prior bar chart with a Civ VI-style ranked scoreboard UI (rank badge, mentions meter, risk tier chip) for faster scanability.
- **Non-Junk Person Enforcement:** Leaderboard now hard-filters to person-like entities only and excludes junk/suppressed rows via `isJunkEntity`, `junk_tier`, and `junk_flag`.

### Content Accuracy

- **About Page Ingestion Language Updated:** Removed outdated “Data Sets 9–12 complete” wording and replaced with live-progress framing.
- **Live Status Summary:** About page now derives ingestion summary text from the runtime `pipeline_status.datasets` payload, so headline status tracks real ingest state.

## 15.9.0 - 2026-03-07 - Pipeline Snapshot + Analytics Fixes

### Data Integrity

- **Document Type Chart Fixed:** Rebuilt `mv_docs_by_type` materialized view using `file_type` (was silently referencing renamed column `mime_type`, freezing all documents as "Other").
- **Extracted Date Backfill:** 225,440 documents now carry historical `extracted_date` values derived from YYYYMMDD filename prefixes and RFC 2822 email `Date:` headers — timeline now shows accurate 1952–2024 document distribution instead of all-2026 ingestion dates.
- **Total Documents Stat Card:** Stat now reads from live `totalCounts.documents` query rather than stale `mv_redaction_stats`, eliminating the "0 documents" display bug.
- **Top Entities De-Junked:** Entity count display fixed (BigInt string concatenation → numeric add); stricter SQL filters (word-count ≤ 3, mentions ≥ 2, expanded NOT ILIKE patterns) remove construction/OCR artifacts like "Dumpster Hauls Provided" from rankings.

### Pipeline Status

- **Ingestion Progress:** 286,638 / 1,425,126 documents (20.1%) have extracted content. DOJ Data Set 9 is 42.7% processed; DS10 is actively ingesting (2.4%); DS11 queued.
- **Enrichment:** 532,374 entities extracted; 1,675,020 relationships mapped.

## 15.8.0 - 2026-03-06 - Analytics Data Integrity + Map/Chart Reliability

### Analytics Data Quality

- **Top Mentioned Individuals De-Junked:** Replaced the prior top-entities aggregation path with stricter person-only, non-junk, non-quarantined server filtering and canonical-name consolidation so OCR/UI artifact entities no longer dominate rankings.
- **Risk Distribution Fallbacks Fixed:** Classic analytics now correctly derives risk buckets from `redFlagDistribution` / `likelihoodDistribution` when `riskByType` is absent, preventing empty risk charts.
- **Tree Map Data Source Corrected:** Interactive entity treemap now falls back to `topEntities` when `topConnectedEntities` is unavailable, eliminating empty map states in classic analytics.

### Timeline + Type Visuals

- **Document Distribution Readability:** Timeline bars now aggregate to yearly buckets (1980–2026 window) with stable year ticks, making the expected historical span visible instead of being visually dominated by ingestion-month spikes.
- **Document Type Normalization:** Enhanced analytics document types are grouped into meaningful categories (`PDF`, `Email`, `Image`, `Video`, `Audio`, `Text`, `Other`) before rendering, so the chart surface no longer presents as a single undifferentiated total.
- **Top Mentioned Chart Alignment:** Increased Y-axis label space and tick anchoring in the horizontal bar chart to fix label/bar misalignment and overflow.

### Geospatial Reliability

- **Map No-Data Fallback:** When entity geocoordinates are unavailable, the interactive map now falls back to real flight-airport coordinates from `/api/flights/airports` instead of rendering zero locations.
- **World-Zoom Constraint:** The interactive map now enforces world bounds and minimum zoom at full-world scale, preventing zoom-out beyond a 1:1 world frame.

## 15.7.0 - 2026-03-06 - Degraded Mode Stability + 503 Read Availability

### Runtime Stability

- **Degraded Mode Provider Wiring:** Added `DegradedModeProvider` to the client root tree so `useDegradedMode` consumers (including the degraded banner) no longer throw runtime context errors.
- **Crash Loop Resolved:** Eliminated the `useDegradedMode must be used within DegradedModeProvider` production failure path surfaced through `ScopedErrorBoundary`.

### Availability Under Load

- **Load Shedding Policy Adjustment:** Updated server-side `toobusy` handling to prioritize shedding mutating traffic first while keeping public read requests (`GET/HEAD/OPTIONS`) available.
- **503 Handling Improvement:** Mutating `/api/*` requests now receive structured JSON `503` responses during overload, while read/UI traffic remains serviceable.

### Data Surface Reliability

- **Black Book Filter Safety:** Stopped sending `letter=ALL` as a literal API filter from the Black Book UI.
- **About/Stats Fetch Hardening:** Switched About page aggregate fetches to JSON-validated `Promise.allSettled` handling so one failing endpoint no longer zeros all displayed metrics.
- **Document Detail Schema Fallback:** Hardened `/api/documents/:id` text derivation to support both `document_pages.extracted_text` and legacy `document_pages.content`, with `document_sentences` fallback, preventing 500s on mixed production schemas.

## 15.6.0 - 2026-03-05 - Public Read / Admin Write Policy + Security Hardening

### Access Control Policy

- **Public Read Surface:** Read endpoints remain publicly accessible for investigative browsing, including static corpus serving.
- **Admin-Only Writes:** Non-read API methods are now centrally enforced as authenticated admin-only, covering media edits, tagging, and user-management style mutations.
- **Auth Route Tightening:** Password change operations are explicitly restricted to admin role.

### Security & Audit Integrity

- **Error Log Redaction:** Removed full request-body logging from global error handling and replaced it with key-only context.
- **Audit Logging Fail-Closed:** Audit insert failures now throw instead of being silently swallowed, preventing untracked sensitive actions.
- **Request Correlation:** Audit payloads now support request-id linkage for traceable forensic timelines.
- **Upload Chain-of-Custody Fix:** Evidence upload now correctly awaits DB insert and logs valid document IDs.
- **Refresh Token Rotation:** Added refresh-token persistence/rotation plumbing and migration support for revocation-aware session handling.

### Search & Reliability

- **Prefix Query Safety:** Removed the universal-match fallback for empty prefix tokens; invalid tokenized prefix queries now return empty, explicit result sets.
- **Document Detail Resilience:** `/api/documents/:id` now degrades gracefully when face-cluster tables are absent, instead of returning 500.
- **Production Gate Readiness:** Local CI-equivalent checks passed (`type-check`, `lint`, `test:unit`, `build`) before release cut.

## 15.5.0 - 2026-03-05 - Unified Modern Viewer + Gmail-Style Email Workspace

### Viewer Architecture

- **Legacy Viewer Deleted:** Removed the old inline `DocumentViewer` implementation from `DocumentBrowser` and all associated dead code/imports.
- **One Viewer Path:** Document selection now always routes through `DocumentModal`, eliminating split behavior and regressions between two viewer stacks.

### UX Simplification

- **Reduced Tab Overload:** Consolidated top-level viewer tabs to `Summary`, `PDF View`, `Text Analysis`, `Annotations`, and `Provenance`.
- **Text Modes Grouped:** Merged `Clean Text`, `Raw OCR`, and `Diff View` into a single `Text Analysis` workspace with in-panel mode toggles.
- **Not Everything is a Tab:** Detailed entity and related-document exploration moved into the `Summary` flow while retaining click-through and dossier actions.

### Intel Rail Behavior

- **Info Pane Collapsed by Default:** Right intelligence pane now defaults to collapsed on open for cleaner first-read focus while still available on demand.

### Email Workspace UX

- **Filter Drawer, Not Always-On Panel:** Conversation filters are now hidden behind a compact `Filters` dropdown in the thread toolbar, preserving vertical space for thread scanning.
- **Body-First Layout:** Rebalanced pane widths to prioritize the reading surface so message bodies remain the focal area.
- **No Centered Reading Canvas:** Removed centered/narrow message thread positioning to keep long-form email content left-anchored and easier to read at speed.

## 15.4.8 - 2026-03-05 - Unified Modern Document Viewer

### Viewer Consistency

- **Legacy Viewer Removed from Document Browser:** Document browser selections now open the same modern `DocumentModal` experience used elsewhere, replacing the older embedded viewer variant.
- **Consistent Controls & Layout:** Removed the legacy eye/plus-style header controls and old panel chrome from this path for a single consistent viewing UI.
- **Close Behavior Preserved:** Closing the modal still correctly clears document selection and returns to the browser context.

## 15.4.7 - 2026-03-05 - Single-Asset PDF View Simplification

### Document Viewer UI

- **Removed Variant Toggle:** Removed `Dirty / Cleaned / Original` controls from the PDF view toolbar.
- **Single Asset Behavior:** Viewer now always opens the canonical document file for this view, matching the single-source storage model.
- **OCR Separation Preserved:** Dirty vs cleaned distinctions remain in text tabs (`Clean Text` / `Raw OCR`) rather than file-level asset toggles.

## 15.4.6 - 2026-03-05 - Asset Viewer Fix for Non-PDF Documents

### Document Viewer

- **No More Infinite \"Downloading PDF...\":** Fixed `PDF View` hanging on image-backed records (e.g. `.JPG`) by detecting asset type and rendering non-PDF assets directly.
- **Single-Asset Routing:** `Dirty` and `Cleaned` now default to the same canonical document file when dedicated cleaned/original files are not present, instead of forcing missing variant paths.
- **Loading Copy Cleanup:** Updated loader text to `Loading document...` to reflect mixed asset support (PDF/image) instead of PDF-only behavior.

## 15.4.5 - 2026-03-05 - Entity Header Cleanup & Profile Photo Reliability

### UI Refinement

- **Removed Oversized Header Badge:** Removed the large floating `Inferred Evidence` header badge from the entity modal profile area to reduce visual clutter.
- **Profile Image Reliability:** Header profile image now resolves from multiple media URL fields with thumbnail-first fallback and API fallback (`/api/media/images/:id/thumbnail` then `/api/media/images/:id`) for PostgreSQL-normalized media rows.
- **Graceful Fallback:** If an image still fails, the modal falls back to the neutral icon without breaking layout.

## 15.4.4 - 2026-03-05 - Evidence Cards Open Viewer by Full-Row Click

### UX & Navigation

- **Full-Row Click for Evidence:** High-significance evidence rows and linked evidence cards in the entity modal are now fully clickable to open the in-app document viewer (`/documents?id=...`), not just the corner action link.
- **Keyboard Accessible:** Added `Enter` / `Space` activation for these cards to preserve accessibility and fast keyboard workflows.
- **Corner Action Preserved:** The corner `Open source` action still opens in a new tab, but now no longer blocks full-card click behavior.

## 15.4.3 - 2026-03-05 - Document Viewer Entity-Name Crash Fix

### Core Fix

- **Document Viewer Stability:** Fixed a production crash in the document viewer caused by entity records missing `full_name`. Entity rendering now safely normalizes names from `full_name | fullName | name` before matching and click dispatch.
- **Related Entities Panel:** Prevented runtime failures when mention chips are generated from partial entity payloads, ensuring documents always render even with heterogeneous PostgreSQL-backed entity rows.
- **Deployment Hardening:** Excluded local `venv/` trees from formatter/linter scans so production deploy gates are not blocked by workstation-only Python/TensorFlow artifacts.

## 15.4.2 - 2026-03-04 - Timeline Accuracy & Evidence Backing

### Timeline & API

- **Evidence-Backed Timeline:** The Timeline API (`GET /api/timeline`) now returns comprehensive evidence counts for each event, including document, media, and supporting evidence totals.
- **Deduplication:** Improved event grouping logic to merge duplicate timeline entries (e.g., "Epstein Court Documents Released") into single canonical milestones, preventing clutter.
- **Date Filtering:** Added `startDate` and `endDate` query parameters to the timeline feed for precise historical filtering.

### Data Integrity

- **Canonical Milestones:** Established deterministic deduplication keys for major historical events (e.g., Epstein's death, 2024 document releases, bank settlements) to ensure a clean, authoritative chronology.
- **Inference Classifier Fix:** Resolved a regression where real individuals with professional roles (e.g., "Lawyer") were incorrectly classified as inferred entities.
- **Real-Person Priority:** Enforced strict sorting precedence (`RFI -> Risk -> Mentions`) to ensure named individuals always rank above inferred or role-based entities in search results.

### User Experience

- **Rate Limit Stabilization:** Fixed `429 Too Many Requests` errors for public users by implementing proxy-aware rate limiting (`trust proxy`) and increasing the global per-IP allowance.
- **Profile Avatars:** Restored profile photos for entities by implementing a smarter fallback lookup that checks for album matches when direct media links are missing.

## 15.3.0 - 2026-03-04 - Subject Integrity & Performance

### Core Improvements

- **Subject Aggregation:** Hardened the subject card system to correctly merge stats from all alias variants (e.g., "Donald Trump" + "President Trump"), preventing undercounting of mentions.
- **Startup Reliability:** Added automatic fallback to `/api/subjects` if the primary entities endpoint fails, ensuring the application always boots successfully even during partial outages.
- **Media Access:** Opened media endpoints (`/api/media/*`) for public read access, allowing researchers to browse albums and tags without authentication.

### Bug Fixes

- **Stale Bundle Reload:** The client now automatically detects new deployments and reloads the page to prevent "ChunkLoadError" crashes for users with long-running tabs.
- **Public Validation:** Fixed validation logic to allow `limit=500` on public document queries, matching the behavior of the active client.

## 15.0.0 - 2026-03-02 - Production Hardening & PostgreSQL Migration

### Major Architecture Update

- **PostgreSQL Migration:** Standardized the database layer on PostgreSQL 16+, enabling massive concurrency and improved data integrity for the 1.3M document corpus.
- **Database Hardening:** Implemented strict connection pooling, robust health checks (`/api/health/deep`), and automated schema verification to prevent drift.
- **Legacy Cleanup:** Removed obsolete embedded database dependencies and purged legacy database files from production.

### Security & Access

- **Strict RBAC:** Enforced Role-Based Access Control on all sensitive endpoints. Public users can access health and auth routes, while investigative data requires appropriate permissions.
- **Case Export:** Added a secure `GET /api/investigations/:id/export/zip` endpoint for researchers to download comprehensive case bundles (evidence + metadata).

## 14.5.0 - 2026-02-24 - Forensic Analytics & Network Intelligence

### Interactive Intelligence

- **Global Entity Map:** Launched a high-performance geospatial map visualizing 130k+ entity locations with risk-based clustering.
- **Network Graph V2:** Introduced "Semantic Zoom" and "VIP Face Integration" to the network graph, revealing deeper connections and high-risk figures at a glance.
- **Signal Purification:** Deployed advanced heuristics to filter out OCR noise and low-signal artifacts, ensuring cleaner search results and analytics.

### Data Recovery

- **Dataset Restoration:** Restored missing datasets for "Black Book" entries, "Palm Beach Properties," and "Flight Logs" via idempotent PostgreSQL migrations.
- **Email Metadata:** Backfilled missing sender/recipient metadata for thousands of emails by parsing raw `.eml` files, enabling accurate "Person-Only" mailbox filtering.

## 14.0.0 - 2026-02-19 - Temporal Investigation & Forensic Determinism

### Investigative Tools

- **Temporal Graph Filtering:** Added a global timeline slider to the Analytics dashboard, allowing investigators to slice the network graph by specific time periods.
- **Provenance Tracking:** The Evidence Drawer now displays full extraction metadata (AI model, pipeline version), providing complete traceability for every claim.
- **Visual Evidence Encoding:** Differentiated graph edges to show "Direct" (evidence-backed) vs. "Inferred" (agentic) connections.

### UI Polish

- **Liquid Glass Design:** Refreshed the entire UI with a modern "liquid glass" aesthetic, improved depth, and consistent high-contrast accessibility tokens.
- **Unified Navigation:** Reworked the global header and search bar for better usability and reduced visual clutter.

## 13.0.0 - 2026-02-11 - Forensic Transparency & Credibility

### Evidence & Audit

- **Evidence Ladder:** Launched a verified evidence system where every "Direct" claim is backed by at least one specific document span.
- **Agentic Watermarking:** All AI-assisted inferences are now explicitly marked (`was_agentic=true`) and logged for forensic audit.
- **Integrity Suite:** Deployed a new `credibility_tests` suite to continuously verify graph invariants and confidence consistency.

### Operations

- **Deep Health Checks:** Enhanced monitoring to track FTS synchronization, database journal health, and critical table statistics.
- **Automated Backups:** Implemented zero-downtime backups with daily restore drills to guarantee data preservation.

## 12.0.0 - 2026-02-02 - DOJ Archive Consolidation

### Archive Expansion

- **Massive Ingestion:** Integrated DOJ datasets 10, 11, and 12, adding tens of thousands of pages of previously fragmented evidence.
- **Unified Discovery:** Standardized the organizational structure for all DOJ materials to enable seamless cross-referencing.

### Forensic Workspace

- **Financial Transaction Mapper:** Visualizes financial flows between entities to highlight potential money laundering or high-risk transfers.
- **Multi-Source Correlation:** Cross-references entity mentions across the entire archive to surface hidden connections and verify facts.

## 11.0.0 - 2026-01-20 - Data Expansion & Analytics Upgrade

### Flight Logs & Properties

- **Flight Log Expansion:** Expanded the flight database to 110 documented flights (1995-2005) and added support for the "N212JE" Gulfstream II aircraft.
- **Palm Beach Properties:** Ingested 9,535 property records, automatically flagging those owned by known Epstein associates.

### Media & Search

- **Audio Intelligence:** Added transcript-derived titles and smart albums for audio evidence (e.g., "Sascha Barros Interviews").
- **Full Text Search:** Restored high-performance FTS with term highlighting (`<mark>`) in document results.

## 10.0.0 - 2026-01-13 - Media Unification & Audio Intelligence

### Unified Media Experience

- **Media Browser:** Unified Audio, Video, and Image browsing into a consistent interface with batch tagging and filtering.
- **Smart Metadata:** Automatically generates titles and descriptions for audio files based on their transcripts.

### Bug Fixes

- **Modal Stacking:** Resolved critical z-index issues where document viewers would open behind entity modals.
- **Junk Filtering:** Aggressively removed thousands of OCR noise entities (e.g., "Total Cash Disbursements") to improve index quality.
