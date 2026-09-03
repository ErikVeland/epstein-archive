import { describe, expect, it } from 'vitest';
import {
  analyticsBarWidth,
  annualDocumentCounts,
} from '../client/components/pages/analyticsDisplay';
import { analyticsCoverageSchema } from '../shared/contracts/analyticsCoverage';
import { analyticsPeopleSchema } from '../shared/contracts/analyticsPeople';
import { mapLocationsSchema } from '../shared/contracts/analyticsMap';

describe('analytics evidence displays', () => {
  it('rejects missing and out-of-range map coordinates', () => {
    const row = { id: 1, label: 'Example', lat: '10', lng: 20, type: 'person' };
    expect(mapLocationsSchema.parse([row])[0].lat).toBe(10);
    expect(mapLocationsSchema.safeParse([{ ...row, lat: null }]).success).toBe(false);
    expect(mapLocationsSchema.safeParse([{ ...row, lng: 181 }]).success).toBe(false);
  });
  it('keeps unequal bars bounded and distinguishes log from linear scale', () => {
    expect(analyticsBarWidth(1, 1000000, true)).toBeGreaterThan(
      analyticsBarWidth(1, 1000000, false),
    );
    expect(analyticsBarWidth(200, 100, true)).toBe(100);
    expect(analyticsBarWidth(0, 0, true)).toBe(0);
    expect(analyticsBarWidth(NaN, 100, true)).toBe(0);
    expect(analyticsBarWidth(-1, 100, false)).toBe(0);
  });
  it('aggregates dates without inventing events or dropping undated records', () => {
    expect(
      annualDocumentCounts([
        { period: '2005-02', total: 4 },
        { period: '2005-01', total: 3 },
        { period: 'Unknown', total: 9 },
      ]),
    ).toEqual([
      { label: '2005', count: 7 },
      { label: 'Unknown', count: 9 },
    ]);
  });
  it('rejects unavailable coverage instead of coercing null to zero', () => {
    const data = {
      documentsByType: [],
      timelineData: [],
      totalCounts: { documents: '0', entities: 0, relationships: 0, evidenceFiles: 0 },
      reconciliation: { unclassifiedCount: 0, unknownDateCount: 0 },
    };
    expect(analyticsCoverageSchema.parse(data).totalCounts.documents).toBe(0);
    expect(
      analyticsCoverageSchema.safeParse({
        ...data,
        totalCounts: { ...data.totalCounts, documents: null },
      }).success,
    ).toBe(false);
  });
  it('preserves missing mentions separately from zero linked documents', () => {
    const person = {
      id: 1,
      name: 'Example',
      isVip: true,
      reviewed: false,
      storedMentions: null,
      documentCount: 0,
      relationshipCount: 0,
    };
    expect(analyticsPeopleSchema.parse([person])[0].storedMentions).toBeNull();
    expect(analyticsPeopleSchema.safeParse([{ ...person, documentCount: undefined }]).success).toBe(
      false,
    );
  });
});
