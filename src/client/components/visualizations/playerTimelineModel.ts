import type { TimelineEvent } from './Timeline';

export interface TimelinePlayer {
  key: string;
  name: string;
  entityId: number | null;
  count: number;
}

export function eventPlayers(event: TimelineEvent): TimelinePlayer[] {
  const players = new Map<string, TimelinePlayer>();
  for (const entity of event.entities) {
    const name = (typeof entity === 'string' ? entity : entity.name).trim();
    if (!name) continue;
    const id =
      typeof entity === 'object' && Number.isInteger(entity.id) && entity.id > 0 ? entity.id : null;
    const key = id ? `entity:${id}` : `label:${name.toLowerCase()}`;
    players.set(key, { key, name, entityId: id, count: 1 });
  }
  return [...players.values()];
}

export function listPlayers(events: TimelineEvent[]): TimelinePlayer[] {
  const players = new Map<string, TimelinePlayer>();
  for (const event of events) {
    for (const player of eventPlayers(event)) {
      const previous = players.get(player.key);
      players.set(player.key, { ...player, count: (previous?.count ?? 0) + 1 });
    }
  }
  return [...players.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function buildPlayerMap(events: TimelineEvent[], selected: string[], sharedOnly: boolean) {
  const selectedSet = new Set(selected);
  const visible = events
    .filter((event) => {
      const count = eventPlayers(event).filter((player) => selectedSet.has(player.key)).length;
      return Number.isFinite(event.date.getTime()) && count >= (sharedOnly ? 2 : 1);
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));
  const years = [...new Set(visible.map((event) => event.date.getUTCFullYear()))].sort(
    (a, b) => a - b,
  );
  const buckets = new Map<string, TimelineEvent[]>();
  const connections = new Map<string, { year: number; from: string; to: string; count: number }>();
  for (const event of visible) {
    const year = event.date.getUTCFullYear();
    const players = eventPlayers(event).filter((player) => selectedSet.has(player.key));
    for (const player of players) {
      const key = `${player.key}/${year}`;
      buckets.set(key, [...(buckets.get(key) ?? []), event]);
    }
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const [from, to] = [players[i].key, players[j].key].sort();
        const key = `${year}/${from}/${to}`;
        connections.set(key, { year, from, to, count: (connections.get(key)?.count ?? 0) + 1 });
      }
    }
  }
  return { events: visible, years, buckets, connections: [...connections.values()] };
}
