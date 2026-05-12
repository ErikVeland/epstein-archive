import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SEO } from '@client/components/common/SEO';
import { Button, LqText, Surface } from '@client/design-system/lib';
import { apiClient } from '@client/services/apiClient';
import { EntityPicker } from '@client/components/connections/EntityPicker';
import { DossierSection } from '@client/components/connections/DossierSection';
import { FlightEvidenceList } from '@client/components/connections/FlightEvidenceList';
import { ClaimsEvidenceList } from '@client/components/connections/ClaimsEvidenceList';
import { PathVisualization } from '@client/components/connections/PathVisualization';
import { CommunicationsEvidenceList } from '@client/components/connections/CommunicationsEvidenceList';
import { DocumentEvidenceList } from '@client/components/connections/DocumentEvidenceList';
import type { ConnectionDossierDto } from '@shared/dto/connections';
import styles from './ConnectionDossierPage.module.css';

interface EntityOption {
  id: string;
  name: string;
  type: string;
}

export function ConnectionDossierPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const entityAId = searchParams.get('a') ?? '';
  const entityBId = searchParams.get('b') ?? '';

  const setEntity = useCallback(
    (key: 'a' | 'b', entity: EntityOption | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (entity) next.set(key, entity.id);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const swap = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const a = prev.get('a');
        const b = prev.get('b');
        if (a) next.set('b', a);
        else next.delete('b');
        if (b) next.set('a', b);
        else next.delete('a');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const { data, isLoading, isError } = useQuery<ConnectionDossierDto>({
    queryKey: ['connection-dossier', entityAId, entityBId],
    queryFn: () => apiClient.getConnectionDossier(entityAId, entityBId),
    enabled: Boolean(entityAId && entityBId),
    staleTime: 5 * 60 * 1000,
  });

  const ready = Boolean(entityAId && entityBId);
  const summary = data?.summary;

  const entityAOption: EntityOption | null = data?.entityA
    ? { id: data.entityA.id, name: data.entityA.name, type: data.entityA.type }
    : entityAId
      ? { id: entityAId, name: entityAId, type: '' }
      : null;

  const entityBOption: EntityOption | null = data?.entityB
    ? { id: data.entityB.id, name: data.entityB.name, type: data.entityB.type }
    : entityBId
      ? { id: entityBId, name: entityBId, type: '' }
      : null;

  return (
    <main className={styles.page}>
      <SEO
        title="Connection Dossier"
        description="Explore every documented signal linking two entities — flights, communications, claims, financial connections, and network path."
      />

      <header className={styles.header}>
        <div className={styles.pickers}>
          <EntityPicker
            label="Entity A"
            value={entityAOption}
            onChange={(e) => setEntity('a', e)}
            placeholder="Search for a person..."
          />
          <Button
            unstyled
            type="button"
            className={styles.swapBtn}
            onClick={swap}
            aria-label="Swap entities"
          >
            ⇄
          </Button>
          <EntityPicker
            label="Entity B"
            value={entityBOption}
            onChange={(e) => setEntity('b', e)}
            placeholder="Search for a person..."
          />
        </div>

        {ready && summary && (
          <div className={styles.summaryBar}>
            {[
              { label: 'Flights', count: summary.flightCount },
              { label: 'Comms', count: summary.communicationCount },
              { label: 'Claims', count: summary.claimCount },
              { label: 'Documents', count: summary.documentCount },
              {
                label: summary.pathHops != null ? `${summary.pathHops}-hop path` : 'No path',
                count: summary.pathHops ?? 0,
              },
            ].map(({ label, count }) => (
              <span
                key={label}
                className={count > 0 ? styles.summaryPill : styles.summaryPillEmpty}
              >
                <strong>{count}</strong> {label}
              </span>
            ))}
          </div>
        )}
      </header>

      {!ready && (
        <Surface variant="glass" className={styles.emptyState}>
          <LqText variant="body" color="muted">
            Select two entities above to see their connection dossier.
          </LqText>
        </Surface>
      )}

      {ready && isLoading && (
        <Surface variant="glass" className={styles.emptyState}>
          <LqText variant="body" color="muted">
            Analyzing connections...
          </LqText>
        </Surface>
      )}

      {ready && isError && (
        <Surface variant="glass" className={styles.emptyState}>
          <LqText variant="body" color="muted">
            Could not load connection dossier. Check that both entity IDs are valid.
          </LqText>
        </Surface>
      )}

      {ready && data && (
        <div className={styles.sections}>
          <DossierSection icon="Plane" title="Shared Flights" count={summary?.flightCount ?? 0}>
            <FlightEvidenceList flights={data.signals.flights} />
          </DossierSection>

          <DossierSection
            icon="Mail"
            title="Communications"
            count={summary?.communicationCount ?? 0}
          >
            <CommunicationsEvidenceList communications={data.signals.communications} />
          </DossierSection>

          <DossierSection
            icon="Network"
            title="Network Path"
            count={summary?.pathHops != null ? 1 : 0}
            defaultOpen
          >
            {data.signals.path ? (
              <PathVisualization path={data.signals.path} />
            ) : (
              <p className={styles.noPath}>No network path found within 7 hops</p>
            )}
          </DossierSection>

          <DossierSection icon="Quote" title="Corroborated Claims" count={summary?.claimCount ?? 0}>
            <ClaimsEvidenceList claims={data.signals.claims} />
          </DossierSection>

          <DossierSection
            icon="FileText"
            title="Document Co-occurrences"
            count={summary?.documentCount ?? 0}
          >
            <DocumentEvidenceList documents={data.signals.documents} />
          </DossierSection>
        </div>
      )}
    </main>
  );
}
