// TypeScript interfaces for media system

export interface ExifData {
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  latitude?: number;
  longitude?: number;
  colorProfile?: string;
  orientation?: number;
}

export interface MediaImage {
  id: number;
  filename: string;
  file_name?: string;
  originalFilename: string;
  path: string;
  file_path?: string;
  thumbnailPath?: string;
  thumbnail_path?: string;
  title?: string;
  description?: string;
  albumId?: number;
  albumName?: string;
  width?: number;
  height?: number;
  fileSize: number;
  format: string;
  dateTaken?: string;
  dateAdded: string;
  dateModified: string;
  created_at?: string;
  date_modified?: string;
  metadata?: Record<string, unknown>;

  // EXIF data
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  latitude?: number;
  longitude?: number;
  colorProfile?: string;
  orientation?: number;

  // Related data
  tags?: string[];
  rating?: number;
  redFlagRating?: number;
  isSensitive?: boolean;
  documentId?: string | number;
}

export interface Album {
  id: number;
  name: string;
  description?: string;
  coverImageId?: number;
  coverImagePath?: string;
  imageCount?: number;
  dateCreated: string;
  dateModified: string;
}

export interface MediaTag {
  id: number;
  name: string;
  category?: string;
  dateCreated: string;
}

export interface ImageFilter {
  albumId?: number;
  tagId?: number;
  personId?: number;
  tags?: string[];
  format?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  hasPeople?: boolean;
  limit?: number;
  offset?: number;
}

export interface ImageSort {
  field: 'date_taken' | 'date_added' | 'filename' | 'file_size' | 'title';
  order: 'asc' | 'desc';
}

export interface MediaStats {
  totalImages: number;
  totalAlbums: number;
  totalSize: number;
  formatBreakdown: Record<string, number>;
  albumBreakdown: Record<string, number>;
}
