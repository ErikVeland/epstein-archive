import { describe, it, expect } from 'vitest';
import { calculateEvidenceLadder, type PersonAdapter } from '../../../src/client/utils/forensics';

describe('calculateEvidenceLadder', () => {
  it('should return L1 for black book entries', () => {
    const input: PersonAdapter = {
      id: 1,
      name: 'Test Person',
      mentions: 10,
      blackBookEntries: ['some entry'],
    };
    const result = calculateEvidenceLadder(input);
    expect(result.level).toBe('L1');
  });

  it('should return L1 for flight logs', () => {
    const input: PersonAdapter = {
      id: 2,
      name: 'Flyer',
      mentions: 10,
      evidenceTypes: ['flight_log'],
    };
    const result = calculateEvidenceLadder(input);
    expect(result.level).toBe('L1');
  });

  it('should return L2 for high mentions', () => {
    const input: PersonAdapter = {
      id: 3,
      name: 'Popular',
      mentions: 100,
      connections: '2',
    };
    const result = calculateEvidenceLadder(input);
    expect(result.level).toBe('L2');
  });

  it('should return L3 for low signal', () => {
    const input: PersonAdapter = {
      id: 4,
      name: 'Unknown',
      mentions: 1,
      connections: '0',
    };
    const result = calculateEvidenceLadder(input);
    expect(result.level).toBe('L3');
  });
});
