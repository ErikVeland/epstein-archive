/**
 * Database Row Interfaces
 *
 * These interfaces represent the raw data returned from SQL queries (both Postgres and SQLite).
 * They often contain both snake_case (legacy/internal) and camelCase (modern/joined) fields.
 */

export interface DbRow {
  [key: string]: unknown;
}

export interface InvestigationRow extends DbRow {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority?: string;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  lead_count?: number;
  leadCount?: number;
  evidence_count?: number;
  evidenceCount?: number;
}

export interface InvestigativeLeadRow extends DbRow {
  id: number;
  investigation_id?: number;
  investigationId?: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  source_document_id?: number | null;
  sourceDocumentId?: number | null;
  source_efta_ref?: string | null;
  sourceEftaRef?: string | null;
  assigned_to?: string | null;
  assignedTo?: string | null;
  created_by?: string | null;
  createdBy?: string | null;
  resolved_at?: string | null;
  resolvedAt?: string | null;
  resolution_notes?: string | null;
  resolutionNotes?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface InvestigationEvidenceRow extends DbRow {
  id: number;
  type?: string;
  evidence_type?: string;
  title: string | null;
  description: string | null;
  source_path?: string;
  sourcePath?: string;
  metadata_json?: string | null;
  metadataJson?: string | null;
  investigation_evidence_id?: number;
  investigationEvidenceId?: number;
  relevance: string;
  added_at?: string;
  addedAt?: string;
  added_by?: string | null;
  addedBy?: string | null;
  notes?: string | null;
  document_id?: number | null;
  documentId?: number | null;
  media_item_id?: number | null;
  mediaItemId?: number | null;
  red_flag_rating?: number;
  redFlagRating?: number;
  ingest_run_id?: number | null;
  ingestRunId?: number | null;
  evidence_ladder?: string | null;
  evidenceLadder?: string | null;
  pipeline_version?: string | null;
  pipelineVersion?: string | null;
  evidence_pack?: string | null;
  evidencePack?: string | null;
  was_agentic?: boolean | number;
  wasAgentic?: boolean | number;
}

export interface EntityRow extends DbRow {
  id: number | string;
  name: string;
  full_name?: string;
  fullName?: string;
  entity_type?: string;
  entityType?: string;
  mentions?: number;
  risk_score?: number;
  riskScore?: number;
  red_flag_rating?: number;
  redFlagRating?: number;
  likelihood_score?: string;
  likelihoodScore?: string;
  primary_role?: string;
  primaryRole?: string;
  is_vip?: boolean | number;
  isVip?: boolean | number;
}
