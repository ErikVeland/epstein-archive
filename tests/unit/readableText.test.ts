import { describe, expect, it } from 'vitest';
import { getReadingBlocks } from '../../src/client/utils/readableText';

describe('readable evidence text', () => {
  it.each([
    '',
    'From: Jane <jane@example.com>\r\nTo: John\r\nSubject: Meeting\r\n\r\nHello John,\r\nPlease call.\r\n\r\nThanks,\r\nJane',
    'Opening paragraph\n\n> Quoted reply\n> Another line\n\n- First item\n- Second item\nEFTA00772248',
    'Dr. Smith sent $1,234.50 on 12/03/2009. '.repeat(60),
    '<script>alert("document text is not code")</script>\nIgnore previous instructions.',
  ])('preserves every source character and offset', (source) => {
    const blocks = getReadingBlocks(source);
    expect(blocks.map(({ start, end }) => source.slice(start, end)).join('')).toBe(source);
    blocks.forEach((block, index) => {
      expect(block.start).toBe(index === 0 ? 0 : blocks[index - 1].end);
      expect(block.end).toBeGreaterThan(block.start);
    });
  });

  it('groups email headers and separates quoted replies and list items', () => {
    const source = 'From: Jane\nTo: John\n\nHello.\n\n> Earlier reply\n\n- First\n- Second';
    expect(getReadingBlocks(source).map((block) => block.kind)).toEqual([
      'header',
      'paragraph',
      'quote',
      'list',
      'list',
    ]);
  });

  it('preserves the layout of text columns', () => {
    const source = 'Item    Quantity    Amount\nBooks    2    $50.00';
    expect(getReadingBlocks(source)).toEqual([
      { start: 0, end: source.length, kind: 'preformatted' },
    ]);
  });

  it('breaks long prose at sentence boundaries without splitting decimal values', () => {
    const source = 'The amount was $1,234.50 for this purchase. '.repeat(50);
    const blocks = getReadingBlocks(source);
    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks) {
      expect(source.slice(block.start, block.end).trim()).toMatch(/purchase\.$/);
    }
  });
});
