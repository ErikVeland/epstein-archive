import {
  EntityListItemDto,
  EntityListResponseDto,
  SubjectCardListItemDto,
  SubjectsListResponseDto,
  RiskLevel,
} from '@shared/dto/entities';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)) : [];

const asUnknownRecordArray = (value: unknown): UnknownRecord[] =>
  Array.isArray(value)
    ? value.filter((item): item is UnknownRecord => typeof item === 'object' && item !== null)
    : [];

export const mapSubjectCardDto = (subject: UnknownRecord): SubjectCardListItemDto => ({
  ...(() => {
    const stats = asRecord(subject.stats);
    const forensics = asRecord(subject.forensics);
    const signalStrength = asRecord(forensics.signalStrength);
    const signalStrengthLegacy = asRecord(forensics.signal_strength);
    const signals = asRecord(subject.signals);
    const topPreview = asRecord(subject.topPreview ?? subject.top_preview);

    return {
      id: String(subject.id),
      name: String(subject.name || subject.displayName || ''),
      role: String(subject.role || 'Unknown'),
      shortBio: subject.short_bio
        ? String(subject.short_bio)
        : subject.shortBio
          ? String(subject.shortBio)
          : subject.bio
            ? String(subject.bio)
            : undefined,
      stats: {
        mentions: Number(stats.mentions ?? subject.mentions ?? 0),
        documents: Number(stats.documents ?? subject.documents ?? 0),
        distinctSources: Number(
          stats.distinctSources ??
            stats.distinct_sources ??
            subject.distinct_sources ??
            subject.distinctSources ??
            0,
        ),
        verifiedMedia: Number(
          stats.verifiedMedia ??
            stats.verified_media ??
            subject.verified_media ??
            subject.mediaCount ??
            0,
        ),
      },
      forensics: {
        riskLevel: String(
          forensics.riskLevel || forensics.risk_level || subject.riskLevel || 'LOW',
        ).toUpperCase() as RiskLevel,
        evidenceLadder: (forensics.evidenceLadder ||
          forensics.evidence_ladder ||
          subject.ladder ||
          'NONE') as 'L1' | 'L2' | 'L3' | 'NONE',
        redFlagObjective:
          typeof forensics.redFlagObjective === 'number'
            ? forensics.redFlagObjective
            : typeof forensics.red_flag_objective === 'number'
              ? forensics.red_flag_objective
              : typeof subject.redFlagRating === 'number'
                ? subject.redFlagRating
                : undefined,
        redFlagSubjective:
          typeof forensics.redFlagSubjective === 'number'
            ? forensics.redFlagSubjective
            : typeof forensics.red_flag_subjective === 'number'
              ? forensics.red_flag_subjective
              : typeof subject.redFlagRating === 'number'
                ? subject.redFlagRating
                : undefined,
        signalStrength: {
          exposure: Number(
            signalStrength.exposure ?? signalStrengthLegacy.exposure ?? signals.exposure ?? 0,
          ),
          connectivity: Number(
            signalStrength.connectivity ??
              signalStrengthLegacy.connectivity ??
              signals.connectivity ??
              0,
          ),
          corroboration: Number(
            signalStrength.corroboration ??
              signalStrengthLegacy.corroboration ??
              signals.corroboration ??
              0,
          ),
        },
        driverLabels: Array.isArray(forensics.driverLabels)
          ? asStringArray(forensics.driverLabels)
          : Array.isArray(forensics.driver_labels)
            ? asStringArray(forensics.driver_labels)
            : Array.isArray(subject.drivers)
              ? asStringArray(subject.drivers)
              : [],
      },
      topPreview:
        Object.keys(topPreview).length > 0
          ? {
              id: String(topPreview.id ?? ''),
              type:
                (String(
                  topPreview.type ?? 'document',
                ) as SubjectCardListItemDto['topPreview'] extends infer T
                  ? T extends { type: infer U }
                    ? U
                    : never
                  : never) || 'document',
              title: String(topPreview.title ?? ''),
              citation: String(topPreview.citation ?? ''),
              confidence: Number(topPreview.confidence ?? 0),
              ...(typeof topPreview.year === 'number' ? { year: topPreview.year } : {}),
            }
          : undefined,
      ...(subject.topPhotoId ? { topPhotoId: String(subject.topPhotoId) } : {}),
      ...(subject.faceCropUrl ? { faceCropUrl: String(subject.faceCropUrl) } : {}),
    };
  })(),
});

export const mapSubjectsListResponseDto = (result: UnknownRecord): SubjectsListResponseDto => ({
  subjects: Array.isArray(result?.subjects)
    ? (result.subjects as UnknownRecord[]).map(mapSubjectCardDto)
    : [],
  total: Number(result?.total || 0),
});

export const mapEntityListItemDto = (
  entity: UnknownRecord,
  photosByEntity: Record<string, UnknownRecord[]> = {},
): EntityListItemDto => ({
  id: typeof entity.id === 'number' || typeof entity.id === 'string' ? entity.id : '',
  name: String(entity.full_name || entity.fullName || entity.name || 'Unknown'),
  fullName: String(entity.full_name || entity.fullName || entity.name || 'Unknown'),
  bio: String(entity.bio || ''),
  entityType: String(entity.entity_type || entity.entityType || 'Person'),
  primaryRole: String(entity.primary_role || entity.primaryRole || 'Person of Interest'),
  secondaryRoles: asStringArray(entity.secondary_roles || entity.secondaryRoles),
  mentions: Number(entity.mentions || 0),
  files: Number(entity.document_count || entity.files || entity.documentCount || 0),
  contexts: asUnknownRecordArray(entity.contexts),
  evidenceTypes: asStringArray(entity.evidence_types || entity.evidenceTypes),
  photos:
    photosByEntity[String(entity.id)] ||
    ((entity?.topPhotoId || entity?.top_photo_id
      ? [{ id: Number(entity?.topPhotoId || entity?.top_photo_id) }]
      : []) as UnknownRecord[]),
  significantPassages: asUnknownRecordArray(entity.significant_passages),
  likelihoodScore: String(
    entity.likelihood_score || entity.risk_level || entity.riskLevel || 'LOW',
  ).toUpperCase() as RiskLevel,
  redFlagScore: Number(entity.red_flag_score ?? entity.redFlagScore ?? 0),
  redFlagRating: Number(entity.red_flag_rating ?? entity.redFlagRating ?? 0),
  redFlagPeppers:
    typeof entity.red_flag_rating === 'number' && entity.red_flag_rating > 0
      ? '🚩'.repeat(entity.red_flag_rating)
      : typeof entity.redFlagRating === 'number' && entity.redFlagRating > 0
        ? '🚩'.repeat(entity.redFlagRating)
        : '🏳️',
  redFlagDescription: String(
    entity.red_flag_description ||
      entity.redFlagDescription ||
      `Red Flag Index ${entity.red_flag_rating || entity.redFlagRating || 0}`,
  ),
  connectionsToEpstein: String(entity.connections_summary || entity.connectionsSummary || ''),
});

export const mapEntityListResponseDto = (input: {
  entities: UnknownRecord[];
  total: number;
  page: number;
  pageSize: number;
  photosByEntity: Record<string, UnknownRecord[]>;
}): EntityListResponseDto => ({
  data: input.entities.map((entity) => mapEntityListItemDto(entity, input.photosByEntity)),
  total: Number(input.total || 0),
  page: Number(input.page || 1),
  pageSize: Number(input.pageSize || 0),
  totalPages: Math.ceil(Number(input.total || 0) / Math.max(1, Number(input.pageSize || 1))),
});

export const mapEntityDetailDto = (entity: UnknownRecord) => {
  const name = entity.full_name || entity.fullName || entity.name || 'Unknown';
  const redFlagRating = Number(entity.red_flag_rating ?? entity.redFlagRating ?? 0);
  const secondaryRolesRaw = entity.secondary_roles || entity.secondaryRoles;
  const secondaryRoles = Array.isArray(secondaryRolesRaw)
    ? secondaryRolesRaw
    : typeof secondaryRolesRaw === 'string' && secondaryRolesRaw.trim().length > 0
      ? secondaryRolesRaw
          .split(',')
          .map((role: string) => role.trim())
          .filter(Boolean)
      : [];
  const contexts = Array.isArray(entity.contexts) ? entity.contexts : [];
  const evidenceTypesRaw = entity.evidence_types || entity.evidenceTypes;
  const evidenceTypes = Array.isArray(evidenceTypesRaw) ? evidenceTypesRaw : [];
  const fileReferences = Array.isArray(entity.fileReferences) ? entity.fileReferences : [];
  const timelineEvents = Array.isArray(entity.timelineEvents) ? entity.timelineEvents : [];
  const networkConnections = Array.isArray(entity.networkConnections)
    ? entity.networkConnections
    : Array.isArray(entity.relationships)
      ? entity.relationships
      : [];
  const relationships = Array.isArray(entity.relationships) ? entity.relationships : [];
  const blackBookEntries = Array.isArray(entity.blackBookEntries) ? entity.blackBookEntries : [];
  const photos = Array.isArray(entity.photos) ? entity.photos : [];
  const significantPassages = Array.isArray(entity.significant_passages)
    ? entity.significant_passages
    : [];
  const bio = String(entity.bio || entity.summary || '');

  return {
    id: String(entity.id),
    name,
    fullName: name,
    entityType: entity.entity_type || entity.entityType || 'Person',
    primaryRole: entity.primary_role || entity.primaryRole || 'Unknown',
    secondaryRoles,
    mentions: Number(entity.mentions || 0),
    files: Number(
      entity.files ?? entity.document_count ?? entity.documentCount ?? fileReferences.length,
    ),
    contexts,
    evidenceTypes,
    likelihoodScore: String(
      entity.likelihood_score || entity.risk_level || entity.riskLevel || 'LOW',
    ).toUpperCase(),
    redFlagScore: Number(entity.red_flag_score ?? entity.redFlagScore ?? 0),
    redFlagRating,
    redFlagPeppers: redFlagRating > 0 ? '🚩'.repeat(redFlagRating) : '🏳️',
    redFlagDescription:
      entity.red_flag_description || entity.redFlagDescription || `Red Flag Index ${redFlagRating}`,
    connectionsToEpstein: entity.connections_summary || entity.connectionsSummary || '',
    fileReferences,
    timelineEvents,
    networkConnections,
    blackBookEntries,
    bio,
    description: String(entity.description || bio),
    photos,
    significantPassages,
    relationships,
    birthDate: entity.birthDate ?? entity.birth_date ?? null,
    deathDate: entity.deathDate ?? entity.death_date ?? null,
    ...(entity.faceCropUrl ? { faceCropUrl: String(entity.faceCropUrl) } : {}),
  };
};
