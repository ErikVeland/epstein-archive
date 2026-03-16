import { describe, it, expect } from 'vitest';
import { calculateEvidenceLadder } from '../../../src/utils/forensics';

describe('calculateEvidenceLadder', () => {
  it('should return L1 for black book entries', () => {
    const result = calculateEvidenceLadder({
      id: 1,
      name: 'Test Person',
      mentions: 10,
      blackBookEntries: ['some entry'],
    } as any);
    expect(result.level).toBe('L1');
  });

  it('should return L1 for flight logs', () => {
    const result = calculateEvidenceLadder({
      id: 2,
      name: 'Flyer',
      mentions: 10,
      evidenceTypes: ['flight_log'],
    } as any);
    expect(result.level).toBe('L1');
  });

  it('should return L2 for high mentions', () => {
    const result = calculateEvidenceLadder({
      id: 3,
      name: 'Popular',
      mentions: 100,
      connections: '2',
    } as any);
    expect(result.level).toBe('L2');
  });

  it('should return L3 for low signal', () => {
    const result = calculateEvidenceLadder({
      id: 4,
      name: 'Unknown',
      mentions: 1,
      connections: '0',
    } as any);
    expect(result.level).toBe('L3');
  });
});
