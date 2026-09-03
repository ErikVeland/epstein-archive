// ============================================================================
// STAGES — stage registry and selection helpers
// ============================================================================

export interface PipelineStats {
  mode: string;
  startTime: string;
  ingestStats?: { filesProcessed: number; errors: number };
  intelStats?: { entitiesExtracted: number; relationsFound: number };
  enrichStats?: { documentsEnriched: number; summariesGenerated: number };
  graphStats?: { subPhasesRun: number };
  stageStats?: Record<string, { exitCode: number; status: string }>;
}

export interface UnifiedStage {
  name: string;
  description: string;
  script?: string;
  args?: string[];
  phase: string;
  version: string;
  modes: Array<'full' | 'ingest' | 'backfill'>;
  requiresAi?: boolean;
}

export const UNIFIED_STAGES: UnifiedStage[] = [
  {
    name: 'ingest',
    description: 'Discover assets, extract content, OCR/VLM fallback, provenance, media sync',
    script: 'scripts/ingest_pipeline.ts',
    phase: 'Ingest',
    version: 'ingest-v3',
    modes: ['full', 'ingest'],
  },
  {
    name: 'entity-intelligence',
    description:
      'Resolve entities, mentions, contacts, credentials, and first-order evidence links',
    script: 'scripts/ingest_intelligence.ts',
    phase: 'Intelligence',
    version: 'entity-intel-v2',
    modes: ['full', 'ingest'],
  },
  {
    name: 'provenance-backfill',
    description: 'Rebuild durable source and chain-of-custody provenance for legacy documents',
    script: 'scripts/backfill_document_provenance.ts',
    phase: 'Provenance Backfill',
    version: 'provenance-v1',
    modes: ['backfill'],
  },
  {
    name: 'image-ocr',
    description: 'Backfill OCR text for image documents before AI summarization',
    script: 'scripts/backfill_image_ocr.ts',
    phase: 'Image OCR Backfill',
    version: 'image-ocr-v1',
    modes: ['backfill'],
  },
  {
    name: 'ai-enrichment',
    description: 'AI OCR repair, summaries, document-level semantic artifacts',
    phase: 'Enrichment',
    version: 'ai-enrich-v2',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'image-media',
    description: 'Backfill image media rows and album bindings',
    script: 'scripts/backfill_image_media.ts',
    phase: 'Image Media Backfill',
    version: 'image-media-v1',
    modes: ['backfill'],
  },
  {
    name: 'email-headers',
    description: 'Backfill parsed email headers for communication analysis',
    script: 'scripts/backfill_email_headers_pg.ts',
    phase: 'Email Header Backfill',
    version: 'email-headers-v1',
    modes: ['backfill'],
  },
  {
    name: 'extracted-dates',
    description: 'Backfill extracted document dates for timeline and search filters',
    script: 'scripts/backfill_extracted_date.ts',
    phase: 'Extracted Date Backfill',
    version: 'dates-v1',
    modes: ['backfill'],
  },
  {
    name: 'media-extraction',
    description: 'Extract media with page-level object provenance and repair legacy records',
    script: 'scripts/extract_media_from_docs.ts',
    phase: 'Embedded Media Extraction',
    version: 'media-extract-v2',
    modes: ['backfill'],
  },
  {
    name: 'vlm-visuals',
    description: 'Analyze only source-verified media classified as probable photographs',
    script: 'scripts/backfill_vlm_visuals.ts',
    phase: 'VLM Visual Analysis',
    version: 'media-vlm-2',
    modes: ['backfill'],
    requiresAi: true,
  },
  {
    name: 'face-ingest',
    description: 'Ingest face clusters and link visual entities where available',
    script: 'scripts/ingest_faces.ts',
    phase: 'Face Intelligence',
    version: 'faces-v1',
    modes: ['backfill'],
  },
  {
    name: 'graph-relations',
    description: 'Extract directed entity relationships with evidence snippets',
    script: 'scripts/extract_directed_relations.ts',
    phase: 'Graph: Directed Relations',
    version: 'graph-relations-v1',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'graph-timeline',
    description: 'Extract dated timeline events from refined content',
    script: 'scripts/extract_timeline_events.ts',
    phase: 'Graph: Timeline Events',
    version: 'graph-timeline-v1',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'graph-financial',
    description: 'Extract financial transactions and counterparties',
    script: 'scripts/extract_financial_transactions.ts',
    phase: 'Graph: Financial Transactions',
    version: 'graph-financial-v1',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'graph-claim-triples',
    description: 'Extract claim triples for corroboration and contradiction analysis',
    script: 'scripts/extract_claim_triples.ts',
    phase: 'Graph: Claim Triples',
    version: 'graph-triples-v2',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'document-significance',
    description: 'Compute document significance scores from extracted evidence signals',
    script: 'scripts/compute_document_significance.ts',
    phase: 'Document Significance',
    version: 'significance-v1',
    modes: ['full', 'ingest', 'backfill'],
  },
  {
    name: 'entity-risk',
    description:
      'Recalculate entity risk based on entity mentions, relationships, claims, and reviews',
    script: 'scripts/recalculate_entity_risk.ts',
    phase: 'Entity Risk Recalculation',
    version: 'entity-risk-v1',
    modes: ['full', 'ingest', 'backfill'],
  },
  {
    name: 'semantic-embeddings',
    description: 'Backfill pgvector embeddings for documents and entities',
    script: 'scripts/backfill_semantic_embeddings.ts',
    phase: 'Semantic Embeddings',
    version: 'semantic-v1',
    modes: ['full', 'ingest', 'backfill'],
  },
  {
    name: 'media-thumbnails',
    description: 'Generate thumbnails and visual previews for evidence assets',
    script: 'scripts/backfill_thumbnails.ts',
    phase: 'Media Thumbnails',
    version: 'thumbs-v1',
    modes: ['backfill'],
  },
  {
    name: 'analytics-refresh',
    description: 'Refresh analytics materialized views and planner stats after backfills',
    script: 'scripts/refresh_analytics_views.ts',
    phase: 'Analytics Refresh',
    version: 'analytics-refresh-v1',
    modes: ['full', 'ingest', 'backfill'],
  },
];

export function stageByName(name: string): UnifiedStage {
  const stage = UNIFIED_STAGES.find((candidate) => candidate.name === name);
  if (!stage) throw new Error(`Unknown unified stage: ${name}`);
  return stage;
}

export function stagesForMode(mode: 'full' | 'ingest' | 'backfill'): UnifiedStage[] {
  const requestedStageIndex = process.argv.indexOf('--stage');
  const requestedStage =
    requestedStageIndex >= 0 ? process.argv[requestedStageIndex + 1]?.trim() : '';

  const skippedStages = new Set(
    (process.env.PIPELINE_SKIP_STAGES || '')
      .split(',')
      .map((stage) => stage.trim())
      .filter(Boolean),
  );
  const stages = UNIFIED_STAGES.filter(
    (stage) => stage.modes.includes(mode) && !skippedStages.has(stage.name),
  );
  if (!requestedStage) return stages;

  if (skippedStages.has(requestedStage)) {
    throw new Error(
      `Stage "${requestedStage}" was requested but is disabled by PIPELINE_SKIP_STAGES`,
    );
  }

  const matched = stages.filter((stage) => stage.name === requestedStage);
  if (matched.length === 0) {
    throw new Error(`Stage "${requestedStage}" is not registered for mode "${mode}"`);
  }
  return matched;
}
