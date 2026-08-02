const PLACEHOLDER_TITLE = /^untitled(?:\s+(?:source|document))?$/i;
const GENERATED_SUMMARY_PREFIX = /^document\s+["“][^"”]+["”]\s+summary preview:\s*/i;
const DOCUMENT_NUMBER_PATTERNS = [
  /\bEFTA\d{5,}\b/i,
  /\bHOUSE[_ -]?OVERSIGHT[_ -]?\d+\b/i,
  /\b(?:DOJ|FBI|SDNY|USVI)[_ -]?[A-Z0-9-]*\d[A-Z0-9-]*\b/i,
];

export interface DocumentTitleInput {
  id: string | number;
  title?: string | null;
  fileName?: string | null;
  aiSummary?: string | null;
  ocrText?: string | null;
}

export type DocumentTitleSource = 'stored' | 'ai_summary' | 'ocr' | 'document_number';

export interface DerivedDocumentTitle {
  title: string;
  source: DocumentTitleSource;
}

const normalizeSpace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const cleanCandidate = (value: string): string =>
  normalizeSpace(value)
    .replace(/^[-–—:;,.\s]+/, '')
    .replace(/\s*[.?!]+$/, '')
    .slice(0, 140)
    .trim();

const isUsefulCandidate = (value: string): boolean => {
  if (value.length < 8) return false;
  const letters = (value.match(/[a-z]/gi) || []).length;
  const symbols = (value.match(/[^a-z0-9\s'",:;()&/.-]/gi) || []).length;
  return letters >= 5 && letters / value.length >= 0.45 && symbols <= 3;
};

const titleFromSummary = (summary?: string | null): string | null => {
  if (!summary) return null;
  const cleaned = normalizeSpace(summary).replace(GENERATED_SUMMARY_PREFIX, '');
  if (!cleaned || PLACEHOLDER_TITLE.test(cleaned)) return null;

  const firstSentence = cleaned.match(/^.{8,180}?(?=[.?!](?:\s|$)|$)/)?.[0] || cleaned;
  const candidate = cleanCandidate(firstSentence);
  return isUsefulCandidate(candidate) ? candidate : null;
};

const titleFromOcr = (ocrText?: string | null): string | null => {
  if (!ocrText) return null;
  const lines = ocrText
    .split(/[\r\n]+/)
    .map(cleanCandidate)
    .filter(Boolean)
    .slice(0, 40);

  const subject = lines
    .map((line) => line.match(/^(?:subject|re):\s*(.+)$/i)?.[1])
    .find((value): value is string => Boolean(value && isUsefulCandidate(value)));
  if (subject) return cleanCandidate(subject);

  const candidate = lines.find(
    (line) =>
      isUsefulCandidate(line) &&
      !DOCUMENT_NUMBER_PATTERNS.some((pattern) => pattern.test(line)) &&
      !/^(?:page|case|document|exhibit)\s+\d+/i.test(line),
  );
  return candidate || null;
};

export const extractDocumentNumber = (fileName?: string | null): string | null => {
  if (!fileName) return null;
  for (const pattern of DOCUMENT_NUMBER_PATTERNS) {
    const match = fileName.match(pattern)?.[0];
    if (match) return match.replace(/[ _]+/g, '_').toUpperCase();
  }
  return null;
};

export const isMissingDocumentTitle = (title?: string | null): boolean =>
  !title || !title.trim() || PLACEHOLDER_TITLE.test(title.trim());

export const isFallbackDocumentTitle = (input: DocumentTitleInput): boolean => {
  if (isMissingDocumentTitle(input.title)) return true;
  const title = input.title?.trim();
  return title === extractDocumentNumber(input.fileName) || title === `Document ${input.id}`;
};

export const deriveDocumentTitle = (input: DocumentTitleInput): DerivedDocumentTitle => {
  const stored = input.title?.trim();
  if (stored && !isMissingDocumentTitle(stored)) return { title: stored, source: 'stored' };

  const summaryTitle = titleFromSummary(input.aiSummary);
  if (summaryTitle) return { title: summaryTitle, source: 'ai_summary' };

  const ocrTitle = titleFromOcr(input.ocrText);
  if (ocrTitle) return { title: ocrTitle, source: 'ocr' };

  const documentNumber = extractDocumentNumber(input.fileName);
  return {
    title: documentNumber || `Document ${input.id}`,
    source: 'document_number',
  };
};
