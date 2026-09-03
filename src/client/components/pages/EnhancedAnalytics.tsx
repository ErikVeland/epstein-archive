import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, NativeSelect, SearchField, Surface, Skeleton } from '@client/design-system/lib';
import { AnimatedSegmentedControl } from '../common/AnimatedSegmentedControl';
import { EmptyCorpus } from '../common/EmptyCorpus';
import { InteractiveEntityMap } from '../visualizations/InteractiveEntityMap';
import { analyticsPeopleSchema, analyticsPeersSchema } from '@shared/contracts/analyticsPeople';
import {
  analyticsCoverageSchema,
  analyticsEvidenceSchema,
} from '@shared/contracts/analyticsCoverage';
import { analyticsBarWidth, annualDocumentCounts, decadeDocumentCounts } from './analyticsDisplay';
import s from './EvidenceAnalytics.module.css';

async function readJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Evidence data unavailable (${response.status})`);
  return response.json();
}

function CountBars({
  rows,
  logarithmic,
}: {
  rows: { label: string; count: number }[];
  logarithmic: boolean;
}) {
  const max = Math.max(0, ...rows.map((row) => row.count));
  return (
    <div className={s.bars}>
      {rows.map((row) => (
        <div className={s.barRow} key={row.label}>
          <span>{row.label}</span>
          <div className={s.track}>
            <div style={{ width: `${analyticsBarWidth(row.count, max, logarithmic)}%` }} />
          </div>
          <strong>{row.count.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

export function EnhancedAnalytics() {
  const [tab, setTab] = useState<'people' | 'coverage' | 'places'>('people');
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('vip');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [peerId, setPeerId] = useState<number | null>(null);
  const [logarithmic, setLogarithmic] = useState(true);
  const people = useQuery({
    queryKey: ['analytics-people'],
    queryFn: async ({ signal }) =>
      analyticsPeopleSchema.parse(await readJson('/api/analytics/people', signal)),
    staleTime: 60000,
  });
  const visiblePeople = useMemo(
    () =>
      (people.data ?? []).filter(
        (person) =>
          (scope === 'all' || (scope === 'vip' ? person.isVip : person.documentCount === 0)) &&
          person.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [people.data, scope, search],
  );
  const selected = visiblePeople.find((person) => person.id === selectedId) ?? visiblePeople[0];
  const peers = useQuery({
    queryKey: ['analytics-peers', selected?.id],
    enabled: !!selected && tab === 'people',
    queryFn: async ({ signal }) =>
      analyticsPeersSchema.parse(
        await readJson(`/api/analytics/people/${selected?.id}/peers`, signal),
      ),
  });
  const activePeer = peers.data?.find((peer) => peer.id === peerId);
  const evidence = useQuery({
    queryKey: ['analytics-edge-evidence', selected?.id, activePeer?.id],
    enabled: !!selected && !!activePeer && tab === 'people',
    queryFn: async ({ signal }) =>
      analyticsEvidenceSchema.parse(
        await readJson(
          `/api/graph/edge-evidence?sourceId=${selected?.id}&targetId=${activePeer?.id}`,
          signal,
        ),
      ),
  });
  const coverage = useQuery({
    queryKey: ['analytics-coverage'],
    enabled: tab === 'coverage',
    queryFn: async ({ signal }) =>
      analyticsCoverageSchema.parse(await readJson('/api/analytics/enhanced', signal)),
    staleTime: 60000,
  });
  const years = annualDocumentCounts(coverage.data?.timelineData ?? []);
  const timelineTotal = years.reduce((sum, row) => sum + row.count, 0);
  const typesTotal = (coverage.data?.documentsByType ?? []).reduce(
    (sum, row) => sum + row.count,
    0,
  );

  return (
    <div className={s.root}>
      <AnimatedSegmentedControl
        fullWidth
        compact
        value={tab}
        onChange={setTab}
        ariaLabel="Analytics view"
        options={[
          { value: 'people', label: 'People', icon: 'Users' },
          { value: 'coverage', label: 'Coverage', icon: 'FileText' },
          { value: 'places', label: 'Places', icon: 'MapPin' },
        ]}
      />
      {tab === 'people' && (
        <>
          <div className={s.toolbar}>
            <SearchField
              aria-label="Find a person"
              placeholder="Find a person…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
            <NativeSelect
              aria-label="People scope"
              value={scope}
              onChange={(event) => {
                setScope(event.target.value);
                setPage(0);
              }}
            >
              <option value="vip">VIPs</option>
              <option value="all">VIPs & reviewed people</option>
              <option value="missing">No linked documents</option>
            </NativeSelect>
          </div>
          <p className={s.note}>
            VIP is a curation priority, not an allegation. Clean canonical people only; junk and
            quarantined records are excluded. Up to 500 candidates, ranked by VIP status then linked
            documents.
          </p>
          {people.isLoading ? (
            <div role="status">
              Loading people and document counts…
              <Skeleton height={240} />
            </div>
          ) : people.isError ? (
            <Surface className={s.panel}>
              <p role="alert">People data could not be loaded. Missing data is not zero.</p>
              <Button onClick={() => void people.refetch()}>Retry people</Button>
            </Surface>
          ) : (
            <>
              <p className={s.note} aria-live="polite">
                {visiblePeople.length.toLocaleString()} people in this selection ·{' '}
                {(people.data ?? []).filter((person) => person.documentCount === 0).length}{' '}
                candidates have no linked documents
              </p>
              {visiblePeople.length === 0 ? (
                <EmptyCorpus
                  icon="Users"
                  title="No matching people"
                  body="Change the name or scope. This does not establish that the archive contains no evidence."
                />
              ) : (
                <div className={s.peopleGrid}>
                  <Surface className={s.panel}>
                    <h3>Who can I investigate?</h3>
                    <p className={s.note}>
                      Document counts are distinct source records, not mentions or evidence of
                      misconduct.
                    </p>
                    <div className={s.peopleList}>
                      {visiblePeople.slice(page * 20, page * 20 + 20).map((person) => (
                        <Button
                          className={s.person}
                          variant={selected?.id === person.id ? 'secondary' : 'ghost'}
                          key={person.id}
                          aria-pressed={selected?.id === person.id}
                          onClick={() => {
                            setSelectedId(person.id);
                            setPeerId(null);
                          }}
                        >
                          <span>
                            <strong>{person.name}</strong>
                            <small>
                              {person.isVip ? 'VIP' : 'Reviewed identity'} ·{' '}
                              {person.relationshipCount.toLocaleString()} relationship records
                            </small>
                          </span>
                          <span className={s.documents}>
                            {person.documentCount.toLocaleString()}
                            <small>documents</small>
                          </span>
                        </Button>
                      ))}
                    </div>
                    <div className={s.pagination}>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <span>
                        {page + 1} / {Math.max(1, Math.ceil(visiblePeople.length / 20))}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={(page + 1) * 20 >= visiblePeople.length}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </Surface>
                  {selected && (
                    <Surface className={s.panel}>
                      <div className={s.sectionHeading}>
                        <h3>{selected.name}</h3>
                        <Link to={`/entity/${selected.id}`}>Open profile →</Link>
                      </div>
                      <div className={s.facts}>
                        <div>
                          <strong>{selected.documentCount.toLocaleString()}</strong>
                          <span>Linked documents</span>
                        </div>
                        <div>
                          <strong>{selected.relationshipCount.toLocaleString()}</strong>
                          <span>Relationship records</span>
                        </div>
                        <div>
                          <strong>{selected.storedMentions?.toLocaleString() ?? 'Unknown'}</strong>
                          <span>Stored mention count</span>
                        </div>
                      </div>
                      <p className={s.note}>
                        These measures have different meanings and are not expected to match. Zero
                        linked documents means no document links are stored for this identity.
                      </p>
                      <h4>Which connections have source records?</h4>
                      <p className={s.note}>
                        Up to 50 VIP or reviewed peers. A relationship record can be inferred;
                        inspect the documents before drawing conclusions.
                      </p>
                      {peers.isLoading ? (
                        <div role="status">
                          Loading connections…
                          <Skeleton height={240} />
                        </div>
                      ) : peers.isError ? (
                        <>
                          <p role="alert">Connections unavailable.</p>
                          <Button onClick={() => void peers.refetch()}>Retry connections</Button>
                        </>
                      ) : !peers.data?.length ? (
                        <p>
                          No qualifying peer links are stored. Use the profile to inspect other
                          evidence.
                        </p>
                      ) : (
                        <div className={s.peerList}>
                          {peers.data.map((peer) => (
                            <div className={s.peer} key={peer.id}>
                              <div>
                                <Link to={`/entity/${peer.id}`}>{peer.name}</Link>
                                <small>
                                  {peer.relationshipCount} stored relationship records · unverified
                                </small>
                                {peer.types && (
                                  <details>
                                    <summary>Stored labels (not verified facts)</summary>
                                    <p>{peer.types}</p>
                                  </details>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant={peer.id === activePeer?.id ? 'secondary' : 'ghost'}
                                onClick={() => setPeerId(peer.id)}
                              >
                                Inspect sources
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {activePeer && (
                        <section className={s.evidence} aria-live="polite">
                          <h4>Shared sources: {activePeer.name}</h4>
                          <p className={s.note}>
                            Up to 20 returned records. Shared mentions are not proof of direct
                            contact.
                          </p>
                          {evidence.isLoading ? (
                            <p>Loading source documents…</p>
                          ) : evidence.isError ? (
                            <>
                              <p role="alert">Source lookup failed. This is not an empty result.</p>
                              <Button onClick={() => void evidence.refetch()}>Retry sources</Button>
                            </>
                          ) : !evidence.data?.documents.length ? (
                            <p>
                              No direct shared documents returned. The stored relationship is not
                              corroborated by this lookup.
                            </p>
                          ) : (
                            evidence.data.documents.map((document) => (
                              <article key={document.documentId}>
                                <Link to={`/documents?id=${document.documentId}`}>
                                  {document.title || `Document ${document.documentId}`}
                                </Link>
                                <p>{document.snippet}</p>
                              </article>
                            ))
                          )}
                        </section>
                      )}
                    </Surface>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
      {tab === 'coverage' && (
        <>
          {coverage.isLoading ? (
            <div role="status">
              Loading archive coverage…
              <Skeleton height={240} />
            </div>
          ) : coverage.isError ? (
            <Surface className={s.panel}>
              <p role="alert">
                Coverage data unavailable. No completion percentage can be calculated.
              </p>
              <Button onClick={() => void coverage.refetch()}>Retry coverage</Button>
            </Surface>
          ) : (
            coverage.data && (
              <>
                <Surface className={s.panel}>
                  <h3>What is indexed—and what is missing?</h3>
                  <div className={s.facts}>
                    <div>
                      <strong>{coverage.data.totalCounts.documents.toLocaleString()}</strong>
                      <span>Document records</span>
                    </div>
                    <div>
                      <strong>
                        {coverage.data.reconciliation.unclassifiedCount.toLocaleString()}
                      </strong>
                      <span>Without evidence classification</span>
                    </div>
                    <div>
                      <strong>
                        {(
                          years.find((row) => row.label === 'Unknown')?.count ?? 0
                        ).toLocaleString()}
                      </strong>
                      <span>Without a usable date in this distribution</span>
                    </div>
                  </div>
                  <p className={s.note}>
                    Indexed and classified does not mean verified, fully ingested, or fully
                    enriched. <Link to="/about">Inspect dataset and pipeline coverage →</Link>
                  </p>
                  {(timelineTotal !== coverage.data.totalCounts.documents ||
                    typesTotal !== coverage.data.totalCounts.documents) && (
                    <p role="status">
                      Counts differ: {timelineTotal.toLocaleString()} date-distribution records,{' '}
                      {typesTotal.toLocaleString()} file-type records,{' '}
                      {coverage.data.totalCounts.documents.toLocaleString()} live document records.
                      Cached aggregates may lag. Do not interpret this discrepancy as missing
                      evidence without reconciliation.
                    </p>
                  )}
                </Surface>
                <div className={s.toolbar}>
                  <NativeSelect
                    aria-label="Count scale"
                    value={logarithmic ? 'log' : 'linear'}
                    onChange={(event) => setLogarithmic(event.target.value === 'log')}
                  >
                    <option value="log">Log scale · compare large differences</option>
                    <option value="linear">Linear scale · compare absolute sizes</option>
                  </NativeSelect>
                </div>
                <div className={s.coverageGrid}>
                  <Surface className={s.panel}>
                    <h3>Source file types</h3>
                    <p className={s.note}>
                      Exact counts beside each bar.{' '}
                      {logarithmic
                        ? 'Bar lengths use log(1 + count), not share of the archive.'
                        : 'Bar lengths use the same linear count scale.'}
                    </p>
                    <CountBars
                      rows={coverage.data.documentsByType.map((row) => ({
                        label: row.type || 'Unknown',
                        count: row.count,
                      }))}
                      logarithmic={logarithmic}
                    />
                    <Link to="/documents">Browse original documents →</Link>
                  </Surface>
                  <Surface className={s.panel}>
                    <h3>Dates recorded in the archive</h3>
                    <p className={s.note}>
                      Extracted date, otherwise stored creation date. This is not a timeline of
                      events. A sparse year does not prove that evidence was withheld.
                    </p>
                    <CountBars rows={decadeDocumentCounts(years)} logarithmic={logarithmic} />
                    <details>
                      <summary>Inspect yearly counts</summary>
                      <div className={s.yearDetails}>
                        <CountBars rows={years} logarithmic={logarithmic} />
                      </div>
                    </details>
                    <Link to="/timeline?view=players">Follow the event timeline →</Link>
                  </Surface>
                </div>
              </>
            )
          )}
        </>
      )}
      {tab === 'places' && (
        <Surface className={s.panel}>
          <h3>Locations recorded in the archive</h3>
          <p className={s.note}>
            Coordinates are not proof that a person visited a place. Airport records are labelled
            separately when entity coordinates are unavailable.
          </p>
          <InteractiveEntityMap
            onEntitySelect={(id) => {
              window.location.assign(`/entity/${id}`);
            }}
          />
          <div className={s.toolbar}>
            <Link to="/flights">Inspect flight records →</Link>
            <Link to="/properties">Inspect property records →</Link>
          </div>
        </Surface>
      )}
    </div>
  );
}

export default EnhancedAnalytics;
