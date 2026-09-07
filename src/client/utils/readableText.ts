export interface ReadingBlock {
  start: number;
  end: number;
  kind: 'paragraph' | 'header' | 'quote' | 'list' | 'preformatted';
}

/** Add presentation boundaries without changing source characters or offsets. */
export function getReadingBlocks(text: string): ReadingBlock[] {
  const blocks: ReadingBlock[] = [];
  let start = 0;
  let kind: ReadingBlock['kind'] = 'paragraph';
  const flush = (end: number): void => {
    if (end > start) blocks.push({ start, end, kind });
    start = end;
  };

  for (const match of text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) {
    const line = match[0];
    if (!line) continue;
    const offset = match.index;
    const nextKind: ReadingBlock['kind'] = /^\s*(?:From|To|Cc|Bcc|Sent|Date|Subject):/i.test(line)
      ? 'header'
      : /^\s*(?:>|On .+wrote:|-{2,}\s*(?:Original|Forwarded) message)/i.test(line)
        ? 'quote'
        : /^\s*(?:[-*•]|\d+[.)])\s+/.test(line)
          ? 'list'
          : /\S(?:\t| {2,})\S/.test(line)
            ? 'preformatted'
            : 'paragraph';
    if (line.trim() && (nextKind !== kind || nextKind === 'list')) flush(offset);
    if (line.trim()) kind = nextKind;
    if (!line.trim()) flush(offset + line.length);
  }
  flush(text.length);

  // Split long prose only at sentence boundaries. Keep abbreviations and numbers intact.
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  return blocks.flatMap((block): ReadingBlock[] => {
    if (block.kind !== 'paragraph' || block.end - block.start < 700) return [block];
    const sections: ReadingBlock[] = [];
    let sectionStart = block.start;
    for (const sentence of segmenter.segment(text.slice(block.start, block.end))) {
      const end = block.start + sentence.index + sentence.segment.length;
      if (end - sectionStart >= 450) {
        sections.push({ ...block, start: sectionStart, end });
        sectionStart = end;
      }
    }
    if (sectionStart < block.end) sections.push({ ...block, start: sectionStart });
    return sections;
  });
}
