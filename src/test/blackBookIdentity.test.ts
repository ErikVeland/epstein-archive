import { describe, expect, it } from 'vitest';
import {
  blackBookNameKey,
  matchBlackBookIdentity,
  type BlackBookIdentity,
} from '../server/db/blackBookIdentity';

const identities: BlackBookIdentity[] = [
  { id: 1, fullName: 'Jeffrey Epstein', isVip: true, thumbnailPath: null },
  { id: 2, fullName: 'Ghislaine Maxwell', isVip: true, thumbnailPath: null },
  { id: 3, fullName: 'Donald Trump', isVip: true, thumbnailPath: null },
];
describe('Black Book identity review', () => {
  it('matches a complete surname-first name without changing the source', () => {
    expect(matchBlackBookIdentity('Maxwell, Ghislaine', identities).status).toBe('name_match');
  });
  it('keeps OCR near-matches as suggestions', () => {
    expect(matchBlackBookIdentity('Epstoin, Jeffrey', identities).status).toBe('possible_match');
  });
  it('does not identify household entries, initials, surnames, or junior names', () => {
    for (const name of [
      'Trump',
      'Trump, D',
      'Donald Trump Jr',
      'Maxwell, Kevin and',
      'Trump & Ivana',
    ]) {
      expect(blackBookNameKey(name)).toBeNull();
      expect(matchBlackBookIdentity(name, identities).identity).toBeNull();
    }
  });
  it('does not choose between duplicate identities', () => {
    expect(
      matchBlackBookIdentity('Donald Trump', [...identities, { ...identities[2], id: 4 }]).status,
    ).toBe('ambiguous');
  });
  it('does not identify an unrelated name or a name embedded in other text', () => {
    expect(matchBlackBookIdentity('Office of Donald Trump', identities).identity).toBeNull();
    expect(matchBlackBookIdentity('Essex House', identities).identity).toBeNull();
  });
});
