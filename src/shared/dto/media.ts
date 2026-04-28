export interface MediaMetadata {
  camera?: string;
  location?: { lat: number; lng: number };
  [key: string]: unknown;
}

export interface MediaItemDto {
  id: number;
  entityId: string | number | null;
  documentId: string | number | null;
  filePath: string;
  thumbnailPath: string | null;
  fileType: string | null;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  title: string | null;
  description: string | null;
  isSensitive?: boolean | null;
  verificationStatus: string | null;
  redFlagRating: number;
  metadata: MediaMetadata;
  dateTaken: string | null;
  createdAt: string | null;
  taggedPeople?: string[];
}
