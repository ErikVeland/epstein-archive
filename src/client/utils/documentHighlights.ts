import type { Document } from '@client/types/documents';

// Match source collection and original filename, never environment-specific database IDs.
export const DOCUMENT_HIGHLIGHTS = [
  {
    source: 'Maxwell Proffer',
    filename: 'Interview Transcript - Maxwell 2025.07.25 (Redacted).pdf',
    title: 'Maxwell interview · July 25, 2025',
    category: 'Interview transcript',
    reason: 'Read the second day of the redacted interview.',
  },
  {
    source: 'Maxwell Proffer',
    filename: 'Interview Transcript - Maxwell 2025.07.24 (Redacted).pdf',
    title: 'Maxwell interview · July 24, 2025',
    category: 'Interview transcript',
    reason: 'Read the first day of the redacted interview.',
  },
  {
    source: 'DOJ Phase 1',
    filename: '2020.11 DOJ Office of Professional Responsibility Report.pdf',
    title: 'DOJ professional responsibility report',
    category: 'Oversight report',
    reason: 'Examine the November 2020 report from the Office of Professional Responsibility.',
  },
  {
    source: 'DOJ Phase 1',
    filename: '2023.06 OIG Memorandum 23-085.pdf',
    title: 'Inspector General memorandum 23-085',
    category: 'Oversight record',
    reason: 'Read the June 2023 memorandum in the DOJ release.',
  },
  {
    source: 'Maxwell Proffer',
    filename: 'Signed Maxwell Proffer Agreement (Redacted).pdf',
    title: 'Maxwell’s signed proffer agreement',
    category: 'Signed agreement',
    reason: 'Read the redacted agreement alongside the interview transcripts.',
  },
  {
    source: 'DOJ Phase 1',
    filename: '2025.02.27 Letter from Attorney General Bondi to FBI Director Patel.pdf',
    title: 'Bondi’s letter to FBI Director Patel',
    category: 'Official correspondence',
    reason: 'Read the February 27, 2025 letter included in the release.',
  },
];

export function selectDocumentHighlights(documents: Document[]) {
  return DOCUMENT_HIGHLIGHTS.flatMap((highlight) => {
    const document = documents.find(
      (item) => item.filename === highlight.filename && item.metadata?.source === highlight.source,
    );
    return document ? [{ ...highlight, document }] : [];
  });
}
