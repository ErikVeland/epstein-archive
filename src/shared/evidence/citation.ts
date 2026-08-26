import { createHash } from 'node:crypto';

const CITATION_PREFIX = 'EA-P-';
const CITATION_HASH_LENGTH = 40;
export const EVIDENCE_CITATION_SCHEMA = 'evidence-passage-v2';
export const LEGACY_EVIDENCE_CITATION_SCHEMA = 'evidence-passage-v1';
export type EvidenceCitationSchema =
  | typeof LEGACY_EVIDENCE_CITATION_SCHEMA
  | typeof EVIDENCE_CITATION_SCHEMA;
const FIELD_SEPARATOR = '\u001f';
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export interface EvidenceCitationInput {
  documentId: string | number;
  documentVersionHash: string;
  pageNumber: number | null;
  sentenceIndex: number;
  text: string;
}

export interface EvidenceCitation {
  citationId: string;
  citationSchema: typeof EVIDENCE_CITATION_SCHEMA;
  textSha256: string;
}

export interface EvidenceCitationReference {
  citationId: string;
  citationSchema: EvidenceCitationSchema | string;
  textSha256?: string;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizeSha256(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^sha256:/, '');
  if (!SHA256_PATTERN.test(normalized)) {
    throw new TypeError('documentVersionHash must be a 64-character SHA-256 hex digest');
  }
  return normalized;
}

function assertInteger(value: number, field: string, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${field} must be a safe integer greater than or equal to ${minimum}`);
  }
}

function canonicalCitationId(
  input: EvidenceCitationInput,
  schema: EvidenceCitationSchema,
): { citationId: string; textSha256: string } {
  const documentId = String(input.documentId).trim();
  if (!documentId) {
    throw new TypeError('documentId must identify one source occurrence');
  }
  const documentVersionHash = normalizeSha256(input.documentVersionHash);
  assertInteger(input.sentenceIndex, 'sentenceIndex', 0);
  if (input.pageNumber !== null) {
    assertInteger(input.pageNumber, 'pageNumber', 1);
  }
  if (input.text.trim().length === 0) {
    throw new TypeError('text must contain non-whitespace characters');
  }

  const textSha256 = sha256Hex(input.text);
  const canonicalInput = [
    schema,
    ...(schema === EVIDENCE_CITATION_SCHEMA ? [`document:${documentId}`] : []),
    documentVersionHash,
    input.pageNumber === null ? 'page:null' : `page:${input.pageNumber}`,
    `sentence:${input.sentenceIndex}`,
    `text:${textSha256}`,
  ].join(FIELD_SEPARATOR);
  const citationHash = sha256Hex(canonicalInput);

  return {
    citationId: `${CITATION_PREFIX}${citationHash.slice(0, CITATION_HASH_LENGTH)}`,
    textSha256,
  };
}

/**
 * Builds the stable public citation for one exact document sentence.
 *
 * The text hash covers the source text without normalization. A text correction
 * therefore creates a new citation instead of changing evidence behind an old URL.
 */
export function buildEvidenceCitation(input: EvidenceCitationInput): EvidenceCitation {
  const { citationId, textSha256 } = canonicalCitationId(input, EVIDENCE_CITATION_SCHEMA);

  return {
    citationId,
    citationSchema: EVIDENCE_CITATION_SCHEMA,
    textSha256,
  };
}

/** Verifies a stored public citation against its exact canonical source inputs. */
export function verifyEvidenceCitation(
  input: EvidenceCitationInput,
  reference: EvidenceCitationReference,
): boolean {
  if (
    reference.citationSchema !== EVIDENCE_CITATION_SCHEMA &&
    reference.citationSchema !== LEGACY_EVIDENCE_CITATION_SCHEMA
  ) {
    return false;
  }

  try {
    const expected = canonicalCitationId(input, reference.citationSchema);
    const storedTextSha256 = reference.textSha256
      ? normalizeSha256(reference.textSha256)
      : expected.textSha256;
    return reference.citationId === expected.citationId && storedTextSha256 === expected.textSha256;
  } catch {
    return false;
  }
}
