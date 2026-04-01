/**
 * OCR Text Prettifier Utility
 *
 * Cleans up raw OCR'd text to make it more readable by:
 * - Fixing common OCR errors
 * - Normalizing whitespace
 * - Structuring phone numbers and addresses
 * - Improving line breaks and formatting
 * - Reconstructing paragraphs from broken lines
 */

/**
 * Clean up OCR'd text for better readability
 */
export function prettifyOCRText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // Step 1: Fix common OCR character errors
  const charFixes: [RegExp, string][] = [
    [/0(?=[a-zA-Z])/g, 'O'], // 0 before letter -> O
    [/1(?=[a-zA-Z]{2})/g, 'l'], // 1 before 2+ letters -> l
    [/\|(?=[a-zA-Z])/g, 'I'], // | before letter -> I
    [/\$(?=[a-zA-Z])/g, 'S'], // $ before letter -> S
    [/[''`]/g, "'"], // Smart quotes -> normal
    [/[""]/g, '"'], // Smart double quotes
    [/…/g, '...'], // Ellipsis
    [/—/g, ' - '], // Em dash
    [/–/g, '-'], // En dash
  ];

  for (const [pattern, replacement] of charFixes) {
    text = text.replace(pattern, replacement);
  }

  // Step 2: Clean up excessive whitespace
  text = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, ' ') // Tabs to spaces
    .replace(/ +/g, ' ') // Multiple spaces to single
    .replace(/[^\S\n]+$/gm, '') // Trailing whitespace per line
    .replace(/^[^\S\n]+/gm, '') // Leading whitespace per line
    .replace(/\(\s*\)/g, '') // Empty parentheses
    .replace(/\[\s*\]/g, '') // Empty brackets
    .replace(/^\s*[-–—]\s*$/gm, '') // Lines that are just dashes
    .replace(/^[.,:;]+$/gm, ''); // Lines that are just punctuation

  // Step 3: Remove OCR artifacts (common noise patterns)
  // Note: Control characters range includes \n (0x0A), so we must be careful not to strip it
  text = text
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Control characters excluding \n (0x0A) and \r (0x0D - already norm'd)
    .replace(/[฿€£¥]/g, ''); // Currency symbols that are OCR errors

  // Step 3.5: Targeted Entity Normalization (De-obfuscation)
  // Fix specific patterns where names are obfuscated or misspelled by OCR

  // Trump Obfuscation & Misspellings
  // 1. Spaced out: T r u m p (with optional extra spaces)
  text = text.replace(/t\s+r\s+u\s+m\s+p/gi, 'Trump');
  // 2. Common OCR Misreads
  text = text.replace(/\bTrurnp\b/g, 'Trump'); // rn -> m
  text = text.replace(/\bTromp\b/g, 'Trump'); // o -> u
  text = text.replace(/\bTrunp\b/g, 'Trump'); // n -> m
  text = text.replace(/\bTrmp\b/g, 'Trump'); // missing u

  // Step 4: Paragraph Reconstruction
  const lines = text.split('\n');
  const paragraphs: string[] = [];
  let currentPara = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Handle empty lines (paragraph breaks)
    if (!line) {
      if (currentPara) {
        paragraphs.push(currentPara);
        currentPara = '';
      }
      continue;
    }

    // Strict list detection (must start with pattern)
    // Anchored regex to avoid matching digits/parens mid-sentence
    const isList = /^[•\-*]/.test(line) || /^\d+\./.test(line) || /^\([a-z]\)/.test(line);
    const isHeader = /^[A-Z][A-Z\s\d:.]{4,}$/.test(line); // Heuristic for headers

    if (currentPara === '') {
      currentPara = line;
    } else {
      // Check if we should merge line into currentPara
      const prevEndsWithTerminal = /[.!?:"']$/.test(currentPara);
      const thisStartsLowerCase = /^[a-z]/.test(line);
      const thisIsList = isList;

      // Merge heuristics:
      // 1. If current line starts lowercase, it's almost certainly a continuation (unless previous ended in terminal).
      // 2. If previous line did NOT end in terminal punctuation, it's likely a continuation.
      // 3. BUT lists and headers defy this.

      const shouldMerge =
        (!prevEndsWithTerminal || thisStartsLowerCase) && !thisIsList && !isHeader;

      if (shouldMerge) {
        currentPara += ' ' + line;
      } else {
        paragraphs.push(currentPara);
        currentPara = line;
      }
    }
  }

  if (currentPara) {
    paragraphs.push(currentPara);
  }

  text = paragraphs.join('\n\n');

  // Step 5: Format phone numbers more cleanly
  // Do this AFTER paragraphs to allow patterns to span if needed (though we merged newlines)
  text = text.replace(/(\d{3})[\s.-]*(\d{3})[\s.-]*(\d{4})/g, '$1-$2-$3');

  // UK phone formatting
  text = text.replace(/(0\d{3,4})[\s.-]*(\d{3,4})[\s.-]*(\d{3,4})/g, '$1 $2 $3');

  // Step 6: Labels and Annotations
  const labels = [
    'Tel:',
    'Fax:',
    'Email:',
    'Phone:',
    'Cell:',
    'Mobile:',
    'Address:',
    'Office:',
    'Home:',
    'Work:',
  ];
  for (const label of labels) {
    text = text.replace(new RegExp(`([^\\n])\\s*(${label})`, 'gi'), '$1\n$2');
  }

  // Clean up parenthetical annotations
  text = text
    .replace(/\(\s*h\s*\)/gi, '(home)')
    .replace(/\(\s*w\s*\)/gi, '(work)')
    .replace(/\(\s*c\s*\)/gi, '(cell)')
    .replace(/\(\s*m\s*\)/gi, '(mobile)')
    .replace(/\(\s*f\s*\)/gi, '(fax)')
    .replace(/\(\s*p\s*\)/gi, '(phone)')
    .replace(/\(\s*hf\s*\)/gi, '(home fax)')
    .replace(/\(\s*wf\s*\)/gi, '(work fax)');

  return text.trim();
}

/**
 * Extract a clean name from OCR'd text
 * Takes the first line and cleans it up
 */
export function extractCleanName(rawText: string): string {
  if (!rawText) return 'Unknown';

  const lines = rawText.split('\n');
  const firstLine = lines[0]?.trim() || 'Unknown';

  return (
    firstLine
      .replace(/[^a-zA-Z\s,&'.-]/g, '') // Remove non-name characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/,\s*$/, '') // Remove trailing comma
      .trim() || 'Unknown'
  );
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters except + for international
  const cleaned = phone.replace(/[^\d+]/g, '');

  // US format: 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // US with country code: 11 digits starting with 1
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // UK format: starts with 0, typically 11 digits
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  // International with +: format with spaces
  if (cleaned.startsWith('+')) {
    return cleaned.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
  }

  // Default: just add some spacing
  return phone.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
}

/**
 * Check if text is likely OCR'd (has common OCR artifacts)
 */
export function isLikelyOCR(text: string): boolean {
  if (!text) return false;

  const ocrIndicators = [
    /\|[a-zA-Z]/, // Pipe before letter
    /[0O](?=[a-zA-Z]{2})/, // Zero/O confusion
    /\n{3,}/, // Excessive newlines
    /[฿€]/, // Currency symbols as errors
    /\(\s*\)/, // Empty parentheses
    /[^\x00-\x7F]/, // Non-ASCII characters
  ];

  return ocrIndicators.some((pattern) => pattern.test(text));
}
