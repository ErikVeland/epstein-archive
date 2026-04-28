import type { MediaItemDto, MediaMetadata } from '@shared/dto/media';

interface MediaRowInput {
  id?: unknown;
  entityId?: unknown;
  entity_id?: unknown;
  documentId?: unknown;
  document_id?: unknown;
  filePath?: unknown;
  file_path?: unknown;
  thumbnailPath?: unknown;
  thumbnail_path?: unknown;
  fileType?: unknown;
  file_type?: unknown;
  fileSize?: unknown;
  file_size?: unknown;
  width?: unknown;
  height?: unknown;
  title?: unknown;
  description?: unknown;
  isSensitive?: unknown;
  is_sensitive?: unknown;
  verificationStatus?: unknown;
  verification_status?: unknown;
  redFlagRating?: unknown;
  red_flag_rating?: unknown;
  metadata?: Record<string, unknown>;
  dateTaken?: unknown;
  date_taken?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
  taggedPeople?: { id?: unknown; name?: unknown }[];
  tagged_people?: { id?: unknown; name?: unknown }[];
}

const asId = (value: unknown): string | number | null => {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'bigint') return value.toString();
  return null;
};

const asNullableString = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  return null;
};

const asNullableNumber = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export const mapMediaItemDto = (row: MediaRowInput): MediaItemDto => ({
  id: Number(row.id || 0),
  entityId: asId(row.entityId ?? row.entity_id),
  documentId: asId(row.documentId ?? row.document_id),
  filePath: String(row.filePath ?? row.file_path ?? ''),
  thumbnailPath: asNullableString(row.thumbnailPath ?? row.thumbnail_path),
  fileType: asNullableString(row.fileType ?? row.file_type),
  fileSize: Number(row.fileSize ?? row.file_size ?? 0),
  width: asNullableNumber(row.width),
  height: asNullableNumber(row.height),
  title: asNullableString(row.title),
  description: asNullableString(row.description),
  isSensitive:
    (row.isSensitive ?? row.is_sensitive) != null
      ? Boolean(row.isSensitive ?? row.is_sensitive)
      : null,
  verificationStatus: asNullableString(row.verificationStatus ?? row.verification_status),
  redFlagRating: Number(row.redFlagRating ?? row.red_flag_rating ?? 0),
  metadata: (typeof row.metadata === 'object' && row.metadata !== null
    ? row.metadata
    : {}) as MediaMetadata,
  dateTaken: asNullableString(row.dateTaken ?? row.date_taken),
  createdAt: asNullableString(row.createdAt ?? row.created_at),
  taggedPeople: (() => {
    const raw = row.taggedPeople ?? row.tagged_people;
    return Array.isArray(raw)
      ? raw
          .map((p) => asNullableString((p as Record<string, unknown>)?.name))
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
      : [];
  })(),
});
