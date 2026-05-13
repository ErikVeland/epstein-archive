import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { Surface } from '@client/design-system/lib';
import styles from './ProgressiveIntelligencePanel.module.css';

interface BackfillStatus {
  running?: boolean;
  blocked?: boolean;
  crashed?: boolean;
  phase?: string;
  heartbeatAt?: string;
  counts?: {
    claimTriples: number;
    financialTransactions: number;
    relations: number;
    timelineEvents: number;
    remainingClaimDocs: number;
    docsLastHour: number;
    triplesLastHour: number;
    etaHours: number | null;
    semanticDocumentEmbeddings?: number;
    semanticEntityEmbeddings?: number;
    aiArtifacts?: number;
    reviewedAiArtifacts?: number;
  };
  stages?: Record<string, Record<string, number | string | null>>;
  reducto?: {
    stageTracking: boolean;
    aiArtifacts: boolean;
    semanticEmbeddings: boolean;
  };
}

const fmt = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';

function fmtEta(hours: number | null | undefined): string {
  if (!hours || !Number.isFinite(hours)) return 'Measuring';
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function ProgressiveIntelligencePanel() {
  const { data } = useQuery<BackfillStatus>({
    queryKey: ['backfill-status'],
    queryFn: async () => {
      const response = await fetch('/api/status/backfill');
      if (!response.ok) throw new Error('Backfill status unavailable');
      return (await response.json()) as BackfillStatus;
    },
    refetchInterval: 60_000,
    retry: 1,
  });

  const counts = data?.counts;
  const state = data?.crashed
    ? 'needs attention'
    : data?.blocked
      ? 'blocked'
      : data?.running
        ? 'running'
        : 'idle';

  return (
    <Surface variant="panel" className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Progressive Intelligence</h2>
          <p className={styles.subtitle}>
            Enrichment is live. Empty tabs can show current snapshots while document-specific
            extraction catches up.
          </p>
        </div>
        <span className={styles.phase}>
          <Icon name="Activity" size="sm" />
          {data?.phase || state}
        </span>
      </div>
      <div className={styles.grid}>
        <div className={styles.metric}>
          <div className={styles.value}>{fmt(counts?.claimTriples)}</div>
          <div className={styles.label}>Claim Triples</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.value}>{fmt(counts?.financialTransactions)}</div>
          <div className={styles.label}>Financial Rows</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.value}>{fmt(counts?.docsLastHour)}</div>
          <div className={styles.label}>Docs/Hour</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.value}>{fmtEta(counts?.etaHours)}</div>
          <div className={styles.label}>Rolling ETA</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.value}>{fmt(counts?.aiArtifacts)}</div>
          <div className={styles.label}>AI Artifacts</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.value}>{fmt(counts?.semanticDocumentEmbeddings)}</div>
          <div className={styles.label}>Semantic Docs</div>
        </div>
      </div>
      <div className={styles.footer}>
        <span>{fmt(counts?.remainingClaimDocs)} claim-docs remaining</span>
        <span>{fmt(counts?.triplesLastHour)} triples in the last hour</span>
        <span>{data?.reducto?.stageTracking ? 'Stage-tracked' : 'Legacy status'}</span>
        <span>
          Heartbeat {data?.heartbeatAt ? new Date(data.heartbeatAt).toLocaleTimeString() : '—'}
        </span>
      </div>
    </Surface>
  );
}
