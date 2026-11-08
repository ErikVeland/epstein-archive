import { describe, expect, it } from 'vitest';
import { pacTrackProfileForEntity } from '../../src/client/utils/pacTrackProfiles';
import profiles from '../../src/client/utils/pacTrackProfiles.json';

describe('PACtrack profile links', () => {
  it('links a verified identity to its individual campaign profile', () => {
    expect(pacTrackProfileForEntity({ id: 17491, fullName: 'Chuck Schumer' })).toBe(
      'https://pactrack.glasscode.academy/senate/seats?seat=NY-S3&profile=NY-S3',
    );
  });
  it('does not link an ID whose identity has changed', () => {
    expect(pacTrackProfileForEntity({ id: 17491, fullName: 'Someone Else' })).toBeNull();
    expect(pacTrackProfileForEntity({ id: 65122, fullName: 'Ajay Khanna President' })).toBeNull();
  });
  it('does not guess by name or link an unavailable identity', () => {
    expect(pacTrackProfileForEntity({ id: 'unknown', fullName: 'Chuck Schumer' })).toBeNull();
    expect(pacTrackProfileForEntity(null)).toBeNull();
  });
  it('uses unique archive IDs and direct profile URLs', () => {
    expect(new Set(profiles.map((profile) => profile.entityId)).size).toBe(profiles.length);
    for (const profile of profiles) {
      const url = new URL(profile.pacTrackUrl);
      expect(url.origin).toBe('https://pactrack.glasscode.academy');
      expect(url.searchParams.get('profile')).toBe(url.searchParams.get('seat'));
      expect(profile.fecId).toMatch(/^[HS]/);
    }
  });
});
