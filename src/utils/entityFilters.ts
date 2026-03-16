import { Person } from '../types';

/**
 * Patterns that indicate junk entities (OCR artifacts, legal boilerplate, non-person titles)
 */
const JUNK_PATTERNS = [
  // Legal & System Boilerplate
  /All Rights Reserved/i,
  /Copyright/i,
  /Privacy Policy/i,
  /Terms of Service/i,
  /Service Description/i,
  /Contact Us/i,
  /Unsubscribe/i,
  /Feedback/i,
  /Font[-\s]family/i,
  /Advantage/i,
  /Search\sPersonnel\sName/i,
  /Search\sEntities/i,
  /Search\sPersonal\sName/i,
  /Loading\s\.\.\./i,
  /Checking\s\.\.\./i,
  /Arial|Helvetica|Times\sNew\sRoman|Verdana/i,
  /Click\s+here/i,
  /All\s+Rights\s+Reserved/i,
  /Copyright\s+\d{4}/i,
  /Template\s+Module/i,
  /\[.*\]/, // Bracketed text
  /\{.*\}/, // Braced text
  /^\W+$/, // Only non-word characters
  /\d{3,}/, // Sequences of numbers (likely IDs, not names)
  /^[A-Z]\sName$/i, // "P Name"
  /^[A-Z][a-z]+\sPersonal$/i, // "Search Personal"

  // OCR Artifacts / Generic Placeholders
  /^[A-Z]\sName$/i, // "P Name"
  /^[A-Z][a-z]+\sPersonal$/i, // "Search Personal"
  /Personal\s+Name$/i, // "Search Personal Name"
  /Description\s+Water$/i,
  /^[a-z]/, // Starts with lowercase
  /\d/, // Contains digits
  /^[A-Z]$/, // Single letter names
  /^[bcdefghjklmnpqrstvwxyz]{5,}$/i, // Sequence of consonants

  // Generic Roles/Titles without names
  /^Judge\s+$/i,
  /^Attorney\s+$/i,
  /^President\s+$/i,
  /^Senator\s+$/i,

  // Organization-like patterns (if found in person list)
  /\sGroup$/i,
  /\sInc$/i,
  /\sLLC$/i,
  /\sCorp$/i,
  /\sLtd$/i,
  /Management\sGroup$/i,

  // Locations / Places
  /Towers$/i,
  /Estate$/i,
  /Street$/i,
  /Beach$/i,
  /Cliffs$/i,
  /Island$/i,
  /Mexico$/i,
  /New\s+York/i,
  /Palm\s+Beach/i,
  /Little\s+James/i,
  /Englewood/i,

  // Specific mangled strings from user screenshot
  /TheInformation/i,
  /Had Epstein/i,
  /Uh Floor/i,
  /Sundar Monday/i,
  /Warner Cable/i,
  /Suark\s+Ferrasl/i,
  /Stnect\s+Naw/i,
  /Srarch\s+Pereseel/i,
  /Sent\s+Prasel/i,
  /Searet\s+Persesel/i,
  /Seard\s+Pyrene/i,
  /Search\s+Persoznel/i,
  /\bSearch\s+Persennel\s+Name\b/i,
  /\bSearch\s+Perpenal\s+Name\b/i,
  /\bSearch\s+Furvenel\s+Name\b/i,
  /\bSp\s+Name\b/i,
  /\bTheInformation\b/i,
  /\bEast\s+If\b/i,
  /\bMagstea\s+Jedge\b/i,
  /\bMarg(?:ar|er)et\s+Gir(?:and|ara)\b/i,
  /\bMargarlt\s+Girara\b/i,
  /\bMy\s+Tunsi\b/i,
  /\bSos\s+Kimber(?:y|ly)\s+Meder\b/i,
  /\bKimber(?:y|ly)\s+Meder\b/i,
  /\bDechiqu\b/i,
  /^\.+$/,
  /^[_\-]+$/,
];

/**
 * Heuristic to detect OCR mangled names or junk strings
 */
const hasOcrArtifacts = (name: string): boolean => {
  // Too many consecutive consonants often indicates mangled OCR
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(name)) return true;

  // Missing vowels in a relatively long string
  if (name.length > 6 && !/[aeiouy]/i.test(name)) return true;

  // Very high ratio of capital letters in the middle of words
  const midCaps = name.slice(1).match(/[A-Z]/g);
  if (midCaps && midCaps.length > name.length / 3) return true;

  return false;
};

/**
 * Returns true if the entity name is likely junk/not a real person
 */
export const isJunkEntity = (name: string): boolean => {
  if (!name) return true;
  const trimmed = name.trim();
  if (trimmed.length <= 2) return true;
  const lower = trimmed.toLowerCase();

  // Basic patterns
  if (JUNK_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  // Strong non-person keyword guard for OCR/boilerplate artifacts that still look title-cased.
  // These terms repeatedly appear in noisy extracted entity output and are not human names.
  if (
    /\b(attachment|attachmert|rewritable|disc|building|contact|number|memo|case|bags|roof|beam|jobs|floor)\b/i.test(
      trimmed,
    ) ||
    /\b(en\s+espa|hong\s+kong)\b/i.test(trimmed) ||
    /\b(east\s+if|magstea|jedge|girand|girara|margarlt|tunsi|dechiqu)\b/i.test(trimmed) ||
    lower.includes('see attachment')
  ) {
    return true;
  }

  // OCR heuristics
  if (hasOcrArtifacts(trimmed)) return true;

  return false;
};

/**
 * Strictly filters a list of entities to only those that are likely real people
 */
export const filterPeopleOnly = (people: Person[]): Person[] => {
  return people.filter((p) => {
    const rawName = (p.name || (p as any).full_name || (p as any).fullName || '').trim();
    if (!rawName) return false;

    // Check type explicitly if available
    const type = p.entityType || (p as any).type;
    if (type && !['person', 'Person', 'Individual', 'Unknown'].includes(type)) {
      return false;
    }

    const junkTier = String((p as any).junk_tier || (p as any).junkTier || '').toLowerCase();
    const junkFlag = Number((p as any).junk_flag || (p as any).junkFlag || 0);
    if (junkTier === 'junk' || junkFlag > 0) return false;

    // Apply junk filters
    if (isJunkEntity(rawName)) return false;

    return true;
  });
};
