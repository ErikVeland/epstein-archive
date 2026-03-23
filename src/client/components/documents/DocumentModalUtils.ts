export const normalizeList = (candidate: unknown): string[] => {
  if (!candidate) return [];
  if (Array.isArray(candidate)) {
    return candidate.map((entry) => String(entry || '').trim()).filter((entry) => entry.length > 0);
  }
  if (typeof candidate === 'string') {
    return candidate
      .split(/[\n;,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
};

const toSentenceBullets = (text: string, max = 5): string[] => {
  if (!text) return [];

  const lineBullets = text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\u2022\d.)\s]+/, '').trim())
    .filter((line) => line.length > 20);
  if (lineBullets.length >= 2) return lineBullets.slice(0, max);

  const sentenceBullets = text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 35)
    .slice(0, max);

  return sentenceBullets;
};

export const deriveSummary = (
  doc: Record<string, unknown> | null | undefined,
): { bullets: string[]; sourceLabel: string } => {
  const metadata =
    typeof doc?.metadata === 'object' && doc.metadata !== null && !Array.isArray(doc.metadata)
      ? (doc.metadata as Record<string, unknown>)
      : {};
  const aiSummary =
    (typeof metadata.ai_summary === 'string' && metadata.ai_summary.trim()) ||
    (typeof metadata.summary === 'string' && metadata.summary.trim()) ||
    (typeof doc?.ai_summary === 'string' && doc.ai_summary.trim()) ||
    '';

  const aiBullets = toSentenceBullets(aiSummary, 5);
  if (aiBullets.length > 0) {
    return { bullets: aiBullets, sourceLabel: 'AI summary' };
  }

  const extractedText = String(doc?.contentRefined || doc?.content || '').trim();
  const extractedBullets = toSentenceBullets(extractedText, 5);
  if (extractedBullets.length > 0) {
    return { bullets: extractedBullets, sourceLabel: 'Derived from extracted text' };
  }

  return { bullets: [], sourceLabel: 'No summary available for this document.' };
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};
