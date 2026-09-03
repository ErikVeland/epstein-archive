import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, NativeSelect, Switch } from '@client/design-system/lib';
import { EmptyCorpus } from '../common/EmptyCorpus';
import type { TimelineEvent } from './Timeline';
import { buildPlayerMap, eventPlayers, listPlayers } from './playerTimelineModel';
import styles from './PlayerTimeline.module.css';

const colours = ['#59d8f3', '#c4a1ff', '#f5c86c', '#68dec0', '#f499bd', '#9dbdff', '#f7ab79'];
const columnWidth = 180;
const laneHeight = 104;

interface PlayerTimelineProps {
  events: TimelineEvent[];
  onOpenEvent: (event: TimelineEvent) => void;
}

export function PlayerTimeline({ events, onOpenEvent }: PlayerTimelineProps) {
  const players = useMemo(() => listPlayers(events), [events]);
  const [selection, setSelection] = useState<string[] | null>(null);
  const [decade, setDecade] = useState('all');
  const [type, setType] = useState('all');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const selected = useMemo(
    () => selection ?? players.slice(0, 6).map((player) => player.key),
    [selection, players],
  );
  const lanes = players.filter((player) => selected.includes(player.key));
  const scopedEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          (decade === 'all' ||
            Math.floor(event.date.getUTCFullYear() / 10) * 10 === Number(decade)) &&
          (type === 'all' || event.type === type),
      ),
    [events, decade, type],
  );
  const map = useMemo(
    () => buildPlayerMap(scopedEvents, selected, sharedOnly),
    [scopedEvents, selected, sharedOnly],
  );
  const activeKey = active && map.buckets.has(active) ? active : map.buckets.keys().next().value;
  const activeEvents = activeKey ? (map.buckets.get(activeKey) ?? []) : [];
  const activePlayer = lanes.find((player) => activeKey?.startsWith(`${player.key}/`));
  const decades = [
    ...new Set(events.map((event) => Math.floor(event.date.getUTCFullYear() / 10) * 10)),
  ].sort((a, b) => a - b);
  const width = Math.max(1, map.years.length) * columnWidth;
  const height = lanes.length * laneHeight + 48;
  const colour = (key: string) =>
    colours[players.findIndex((player) => player.key === key) % colours.length];

  return (
    <section className={styles.root} aria-label="Player paths">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>FOLLOW THE RECORD</p>
          <h3>People, paths & shared events</h3>
        </div>
        <p>
          Solid paths connect records for one name. Dashed links mark a shared event, not proof of
          contact, causation, or wrongdoing.
        </p>
      </div>
      <div className={styles.filters}>
        <label>
          Period
          <NativeSelect
            aria-label="Period"
            value={decade}
            onChange={(event) => setDecade(event.target.value)}
          >
            <option value="all">All years</option>
            {decades.map((year) => (
              <option key={year} value={year}>
                {year}s
              </option>
            ))}
          </NativeSelect>
        </label>
        <label>
          Event type
          <NativeSelect
            aria-label="Event type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="all">All event types</option>
            {[...new Set(events.map((event) => event.type))].sort().map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className={styles.switch}>
          <Switch
            checked={sharedOnly}
            onCheckedChange={setSharedOnly}
            aria-label="Shared events only"
          />
          Shared events only
        </label>
      </div>
      <details className={styles.people}>
        <summary>
          Choose people & organisations · {lanes.length} of {players.length} selected
        </summary>
        <div className={styles.playerFilters}>
          {players.map((player) => (
            <Button
              key={player.key}
              size="sm"
              variant={selected.includes(player.key) ? 'secondary' : 'ghost'}
              aria-pressed={selected.includes(player.key)}
              onClick={() =>
                setSelection(
                  selected.includes(player.key)
                    ? selected.filter((key) => key !== player.key)
                    : [...selected, player.key],
                )
              }
            >
              <span className={styles.swatch} style={{ background: colour(player.key) }} />
              {player.name}
              <span className={styles.count}>{player.count}</span>
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelection(players.map((player) => player.key))}
          >
            Select all
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelection([])}>
            Clear
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelection(null);
              setDecade('all');
              setType('all');
              setSharedOnly(false);
              setActive(null);
            }}
          >
            Reset
          </Button>
        </div>
      </details>
      <p className={styles.caption} aria-live="polite">
        {map.events.length} matching events ·{' '}
        {events.filter((event) => eventPlayers(event).length === 0).length} records have no named
        player and remain in Chronology. Year columns have equal width; gaps are not elapsed time.
      </p>
      {map.events.length === 0 ? (
        <EmptyCorpus
          icon="Users"
          title="No matching player events"
          body="Select a player or change the period, type, and shared-event filters."
        />
      ) : (
        <div className={styles.workspace}>
          <div className={styles.mapPanel}>
            <p className={styles.caption}>
              Scroll sideways to follow years. Select a node to inspect its records.
            </p>
            <div
              className={styles.mapScroll}
              tabIndex={0}
              role="region"
              aria-label="Player paths map, scroll horizontally for more years"
            >
              <div className={styles.canvas} style={{ width: width + 160, height }}>
                <svg
                  className={styles.paths}
                  width={width}
                  height={height}
                  style={{ left: 160 }}
                  aria-hidden="true"
                >
                  {map.years.map((year, index) => (
                    <g key={year}>
                      <line
                        x1={index * columnWidth + 90}
                        x2={index * columnWidth + 90}
                        y1={38}
                        y2={height}
                        stroke="currentColor"
                        opacity=".1"
                      />
                      <text
                        x={index * columnWidth + 90}
                        y={24}
                        textAnchor="middle"
                        fill="currentColor"
                      >
                        {year}
                      </text>
                    </g>
                  ))}
                  {lanes.map((player, index) => {
                    const years = map.years.filter((year) =>
                      map.buckets.has(`${player.key}/${year}`),
                    );
                    if (years.length === 0) return null;
                    const y = index * laneHeight + 92;
                    return (
                      <path
                        key={player.key}
                        d={`M ${map.years.indexOf(years[0]) * columnWidth + 90} ${y} H ${map.years.indexOf(years[years.length - 1]) * columnWidth + 90}`}
                        fill="none"
                        stroke={colour(player.key)}
                        strokeWidth="2"
                        opacity=".6"
                      />
                    );
                  })}
                  {map.connections.map((connection) => {
                    const x = map.years.indexOf(connection.year) * columnWidth + 90;
                    const from =
                      lanes.findIndex((player) => player.key === connection.from) * laneHeight + 92;
                    const to =
                      lanes.findIndex((player) => player.key === connection.to) * laneHeight + 92;
                    return (
                      <path
                        key={`${connection.year}/${connection.from}/${connection.to}`}
                        d={`M ${x} ${from} C ${x + 80} ${from}, ${x + 80} ${to}, ${x} ${to}`}
                        stroke="currentColor"
                        strokeDasharray="4 6"
                        fill="none"
                        opacity=".25"
                      />
                    );
                  })}
                </svg>
                <div className={styles.laneLabels}>
                  {lanes.map((player, index) => (
                    <div
                      key={player.key}
                      className={styles.laneLabel}
                      style={{ top: index * laneHeight + 48, borderLeftColor: colour(player.key) }}
                    >
                      {player.entityId ? (
                        <Link to={`/entity/${player.entityId}`}>{player.name}</Link>
                      ) : (
                        <span>{player.name}</span>
                      )}
                      <small>{player.entityId ? 'Linked profile' : 'Unresolved name'}</small>
                    </div>
                  ))}
                </div>
                {lanes.map((player, index) => (
                  <React.Fragment key={player.key}>
                    {map.years.map((year, yearIndex) => {
                      const key = `${player.key}/${year}`;
                      const entries = map.buckets.get(key);
                      if (!entries) return null;
                      return (
                        <Button
                          key={key}
                          variant={activeKey === key ? 'secondary' : 'glass'}
                          className={styles.node}
                          style={{
                            left: 160 + yearIndex * columnWidth + 20,
                            top: index * laneHeight + 60,
                            borderColor: colour(player.key),
                          }}
                          aria-pressed={activeKey === key}
                          aria-label={`${player.name}, ${year}, ${entries.length} events`}
                          title={entries.map((entry) => entry.title).join('\n')}
                          onClick={() => {
                            setActive(key);
                            if (window.matchMedia('(max-width: 1000px)').matches) {
                              inspectorRef.current?.scrollIntoView({ block: 'start' });
                            }
                          }}
                        >
                          <span>
                            {year} · {entries.length} {entries.length === 1 ? 'event' : 'events'}
                          </span>
                          <strong>{entries[0].title}</strong>
                        </Button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <aside
            ref={inspectorRef}
            className={styles.inspector}
            aria-label="Selected records"
            aria-live="polite"
          >
            <p className={styles.eyebrow}>SELECTED PATH</p>
            <h4>
              {activePlayer?.name} · {activeEvents[0]?.date.getUTCFullYear()}
            </h4>
            <p className={styles.caption}>
              Archive entries are not independently verified by this view. Open each event to check
              its source coverage.
            </p>
            {activeEvents.map((event) => (
              <article key={event.id} className={styles.record}>
                <time>
                  {event.date.toLocaleDateString('en-GB', {
                    timeZone: 'UTC',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
                <h5>{event.title}</h5>
                <p>{event.description}</p>
                <div className={styles.participants}>
                  {eventPlayers(event).map((player) => (
                    <span key={player.key}>{player.name}</span>
                  ))}
                </div>
                <small>
                  {event.related_document ? 'Source document linked' : 'Direct source not linked'}
                </small>
                <Button size="sm" variant="secondary" onClick={() => onOpenEvent(event)}>
                  Inspect event & sources
                </Button>
              </article>
            ))}
          </aside>
        </div>
      )}
    </section>
  );
}
