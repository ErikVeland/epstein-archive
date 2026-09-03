import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '../client/components/visualizations/Timeline';
import {
  buildPlayerMap,
  eventPlayers,
  listPlayers,
} from '../client/components/visualizations/playerTimelineModel';

const event = (id: string, entities: TimelineEvent['entities'], year = 2000): TimelineEvent => ({
  id,
  entities,
  date: new Date(`${year}-01-01T00:00:00Z`),
  title: id,
  description: '',
  type: 'legal',
  file: '',
  significance: 'high',
});

describe('player timeline map', () => {
  it('deduplicates an entity within a record and keeps unresolved labels separate', () => {
    const record = event('a', [
      { id: 1, name: 'Person A' },
      { id: 1, name: 'Person A' },
      'Person A',
    ]);
    expect(eventPlayers(record).map((player) => player.key)).toEqual([
      'entity:1',
      'label:person a',
    ]);
    expect(listPlayers([record])[0].count).toBe(1);
  });
  it('does not infer a connection from events in the same year', () => {
    const map = buildPlayerMap(
      [event('a', [{ id: 1, name: 'A' }]), event('b', [{ id: 2, name: 'B' }])],
      ['entity:1', 'entity:2'],
      false,
    );
    expect(map.connections).toEqual([]);
    expect(map.events).toHaveLength(2);
  });
  it('only connects participants explicitly named in the same record', () => {
    const events = [
      event('a', [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]),
      event('b', [{ id: 1, name: 'A' }]),
    ];
    const map = buildPlayerMap(events, ['entity:1', 'entity:2'], true);
    expect(map.events.map((record) => record.id)).toEqual(['a']);
    expect(map.connections).toEqual([{ year: 2000, from: 'entity:1', to: 'entity:2', count: 1 }]);
    expect(buildPlayerMap(events, ['entity:1'], true).events).toEqual([]);
  });
  it('handles no selection, no named players, invalid dates and chronological ordering', () => {
    const invalid = { ...event('bad', ['A']), date: new Date('invalid') };
    const events = [
      event('later', ['A'], 2010),
      event('earlier', ['A'], 1990),
      event('unnamed', []),
      invalid,
    ];
    expect(buildPlayerMap(events, [], false).events).toEqual([]);
    const map = buildPlayerMap(events, ['label:a'], false);
    expect(map.years).toEqual([1990, 2010]);
    expect(map.events.map((record) => record.id)).toEqual(['earlier', 'later']);
  });
});
