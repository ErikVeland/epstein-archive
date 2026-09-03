# Black Book source-quality audit

Date: 2026-09-04. Scope: local archive database and preserved 95-page Black Book PDF.

## Findings

- The table contains 1,077 original-book fragments, 284,078 extracted contacts, and 1,232 possible credential records. These populations must not be presented as one address book.
- None of the original fragments had a stored source document or page link before this audit. Fragment counts do not measure unique people or transcription completeness.
- The original query treated a false phone filter as active. It also applied category and other filters after a result limit. The replacement isolates the source category and restores the original population.
- API-level spelling replacements changed the purported raw OCR. Those replacements are removed. Canonical entry text remains unchanged.
- The local face clusters have no assigned entity IDs. A face from a photograph tagged with a person is not necessarily that person. That fallback is removed.
- Complete-name comparison against clean VIP and manually reviewed person records returns 19 name matches, three possible OCR matches, and one ambiguous result. The remaining 1,054 fragments are unresolved against this limited identity index. None of these counts is a human-verification rate.

## Source-page audit

Run `scripts/audit_black_book_pages.ts` with the preserved PDF path and the local database environment. The script is read-only. It emits only source hashes and page references.

The strict audit requires a unique normalized 30–80 character prefix on one PDF page. Only one fragment met this rule. Its position on PDF page 25 was visually checked. The printed exhibit number differs from the PDF page index.

Source SHA-256: `4f8e111d7bd29039742de62e9f67cf5051b617e26a923117df323a5d2fb3c0de`.

The page mapping is keyed by the full raw-entry hash. Changed text cannot inherit that reference. Unmapped entries open the complete original PDF and state that the exact page is unknown.

## Identity boundary

- Complete-name matches normalize punctuation, accents, and token order. They do not establish identity.
- Near spellings remain candidates. They do not replace the source name or receive an automatic portrait.
- Initials, single names, household entries, numeric fragments, and junior/senior qualifiers are not resolved automatically.
- Ambiguous candidates remain unresolved. VIP aliases are not applied wholesale because the existing alias list contains identity collisions, including parent/child names.
- The candidate index excludes quarantined records and roles marked as victims, survivors, or minors.
- Reference portraits have explicit source credits and are labelled separately from evidence. They are not used to recognize anyone in source photographs.

## Remaining work

The book is not 100% verified. A source-bound re-segmentation must preserve page coordinates, distinguish entries from continuation lines, and handle household and organisation records. Each proposed transcription and identity link needs source comparison before canonical acceptance. A missing match is not evidence that a person is absent from the book.

Do not use the extracted-contact table, an OCR entity node, or an inferred identity as proof of Black Book inclusion elsewhere in the application. Broader entity evidence counts still need a separate source-lineage audit.

## Verification

Regression tests cover complete-name matching, ambiguous identities, rejected fragments, preserved raw OCR, phone-filter defaults, and canonical-name search. The UI shows reference credits, candidate labels, raw transcription, and missing page coverage. Desktop and phone layouts were checked locally.
