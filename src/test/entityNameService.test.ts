import { describe, expect, it } from 'vitest';

import { EntityNameService } from '../client/services/EntityNameService';

describe('EntityNameService', () => {
  it('rejects known false-positive sentence fragments', () => {
    const falsePositives = [
      'In No Event And Under No Legal Theory',
      'Including Any Direct',
      'Please notify us immediately by return',
      'Confidentiality notice',
      'This email and any files',
    ];

    falsePositives.forEach((name) => {
      expect(EntityNameService.isValidPersonName(name)).toBe(false);
    });
  });

  it('accepts known person names', () => {
    const validNames = [
      'Donald Trump',
      'Jeffrey Epstein',
      'Bill Clinton',
      'Ghislaine Maxwell',
      'Virginia Giuffre',
    ];

    validNames.forEach((name) => {
      expect(EntityNameService.isValidPersonName(name)).toBe(true);
    });
  });

  it('consolidates common aliases to canonical names', () => {
    const nameVariants = [
      ['Trump', 'Donald Trump'],
      ['DT', 'Donald Trump'],
      ['DJT', 'Donald Trump'],
      ['Donnie', 'Donald Trump'],
      ['Donald', 'Donald Trump'],
      ['Epstein', 'Jeffrey Epstein'],
      ['Clinton', 'Bill Clinton'],
    ] as const;

    nameVariants.forEach(([input, expected]) => {
      expect(EntityNameService.consolidatePersonName(input)).toBe(expected);
    });
  });

  it('recognizes supported organization names', () => {
    const organizations = [
      'Russia',
      'CIA',
      'FBI',
      'Mossad',
      'Kremlin',
      'Central Intelligence Agency',
    ];

    organizations.forEach((name) => {
      expect(EntityNameService.isValidOrganizationName(name)).toBe(true);
    });
  });
});
