import { analyticsPeopleQueries } from '@epstein/db';
import { getApiPool } from './runtime.js';
import type { AnalyticsPerson, AnalyticsPeer } from '../../shared/dto/analyticsPeople';

export const analyticsPeopleRepository = {
  async people(): Promise<AnalyticsPerson[]> {
    const rows = await analyticsPeopleQueries.getAnalyticsPeople.run(undefined, getApiPool());
    return rows
      .map((row) => ({
        id: Number(row.id),
        name: row.name || 'Unnamed',
        isVip: row.isVip === 1,
        reviewed: row.reviewed === 1,
        storedMentions: row.storedMentions == null ? null : Number(row.storedMentions),
        documentCount: Number(row.documentCount),
        relationshipCount: Number(row.relationshipCount),
      }))
      .sort(
        (a, b) =>
          Number(b.isVip) - Number(a.isVip) ||
          b.documentCount - a.documentCount ||
          a.name.localeCompare(b.name),
      );
  },
  async peers(entityId: number): Promise<AnalyticsPeer[]> {
    const rows = await analyticsPeopleQueries.getAnalyticsPeers.run({ entityId }, getApiPool());
    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name || 'Unnamed',
      isVip: row.isVip === 1,
      relationshipCount: Number(row.relationshipCount),
      types: row.types,
    }));
  },
};
