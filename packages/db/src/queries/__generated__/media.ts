/** Types generated for queries found in "src/queries/media.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

/** 'GetAlbumsByMediaType' parameters type */
export interface IGetAlbumsByMediaTypeParams {
  likePattern: string;
}

/** 'GetAlbumsByMediaType' return type */
export interface IGetAlbumsByMediaTypeResult {
  createdAt: Date | null;
  dateModified: Date | null;
  description: string | null;
  id: string;
  itemCount: string | null;
  name: string;
  sensitiveCount: string | null;
}

/** 'GetAlbumsByMediaType' query type */
export interface IGetAlbumsByMediaTypeQuery {
  params: IGetAlbumsByMediaTypeParams;
  result: IGetAlbumsByMediaTypeResult;
}

const getAlbumsByMediaTypeIR: any = {
  usedParamSet: { likePattern: true },
  params: [
    {
      name: 'likePattern',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 320, b: 332 }],
    },
  ],
  statement:
    'SELECT\n  a.id,\n  a.name,\n  a.description,\n  a.created_at as "createdAt",\n  a.date_modified as "dateModified",\n  COUNT(m.id) as "itemCount",\n  SUM(CASE WHEN COALESCE(m.is_sensitive, false) = true THEN 1 ELSE 0 END) as "sensitiveCount"\nFROM media_albums a\nLEFT JOIN media_items m ON a.id = m.album_id AND m.file_type LIKE :likePattern!\nGROUP BY a.id\nHAVING COUNT(m.id) > 0\nORDER BY a.name',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   a.id,
 *   a.name,
 *   a.description,
 *   a.created_at as "createdAt",
 *   a.date_modified as "dateModified",
 *   COUNT(m.id) as "itemCount",
 *   SUM(CASE WHEN COALESCE(m.is_sensitive, false) = true THEN 1 ELSE 0 END) as "sensitiveCount"
 * FROM media_albums a
 * LEFT JOIN media_items m ON a.id = m.album_id AND m.file_type LIKE :likePattern!
 * GROUP BY a.id
 * HAVING COUNT(m.id) > 0
 * ORDER BY a.name
 * ```
 */
export const getAlbumsByMediaType = new PreparedQuery<
  IGetAlbumsByMediaTypeParams,
  IGetAlbumsByMediaTypeResult
>(getAlbumsByMediaTypeIR);

/** 'GetMediaItemsByEntity' parameters type */
export interface IGetMediaItemsByEntityParams {
  entityId: NumberOrString;
}

/** 'GetMediaItemsByEntity' return type */
export interface IGetMediaItemsByEntityResult {
  createdAt: Date | null;
  dateTaken: Date | null;
  description: string | null;
  documentId: string | null;
  entityId: string | null;
  filePath: string;
  fileSize: string | null;
  fileType: string | null;
  height: number | null;
  id: string;
  isSensitive: boolean | null;
  metadataJson: Json | null;
  redFlagRating: number | null;
  thumbnailPath: string | null;
  title: string | null;
  verificationStatus: string | null;
  width: number | null;
}

/** 'GetMediaItemsByEntity' query type */
export interface IGetMediaItemsByEntityQuery {
  params: IGetMediaItemsByEntityParams;
  result: IGetMediaItemsByEntityResult;
}

const getMediaItemsByEntityIR: any = {
  usedParamSet: { entityId: true },
  params: [
    {
      name: 'entityId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 590, b: 599 },
        { a: 620, b: 629 },
      ],
    },
  ],
  statement:
    'SELECT DISTINCT\n  m.id,\n  m.entity_id as "entityId",\n  m.document_id as "documentId",\n  m.file_path as "filePath",\n  m.thumbnail_path as "thumbnailPath",\n  m.file_type as "fileType",\n  m.file_size as "fileSize",\n  m.width,\n  m.height,\n  m.title,\n  m.description,\n  m.is_sensitive as "isSensitive",\n  m.verification_status as "verificationStatus",\n  m.red_flag_rating as "redFlagRating",\n  m.metadata_json as "metadataJson",\n  m.date_taken as "dateTaken",\n  m.created_at as "createdAt"\nFROM media_items m\nLEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text\nWHERE m.entity_id = :entityId! OR mip.entity_id = :entityId!\nORDER BY m.red_flag_rating DESC, m.created_at DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT
 *   m.id,
 *   m.entity_id as "entityId",
 *   m.document_id as "documentId",
 *   m.file_path as "filePath",
 *   m.thumbnail_path as "thumbnailPath",
 *   m.file_type as "fileType",
 *   m.file_size as "fileSize",
 *   m.width,
 *   m.height,
 *   m.title,
 *   m.description,
 *   m.is_sensitive as "isSensitive",
 *   m.verification_status as "verificationStatus",
 *   m.red_flag_rating as "redFlagRating",
 *   m.metadata_json as "metadataJson",
 *   m.date_taken as "dateTaken",
 *   m.created_at as "createdAt"
 * FROM media_items m
 * LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
 * WHERE m.entity_id = :entityId! OR mip.entity_id = :entityId!
 * ORDER BY m.red_flag_rating DESC, m.created_at DESC
 * ```
 */
export const getMediaItemsByEntity = new PreparedQuery<
  IGetMediaItemsByEntityParams,
  IGetMediaItemsByEntityResult
>(getMediaItemsByEntityIR);

/** 'GetAllMediaItems' parameters type */
export type IGetAllMediaItemsParams = void;

/** 'GetAllMediaItems' return type */
export interface IGetAllMediaItemsResult {
  createdAt: Date | null;
  description: string | null;
  documentId: string | null;
  entityId: string | null;
  entityName: string;
  filePath: string;
  fileType: string | null;
  id: string;
  isSensitive: boolean | null;
  metadataJson: Json | null;
  redFlagRating: number | null;
  relatedEntities: string | null;
  title: string | null;
  verificationStatus: string | null;
}

/** 'GetAllMediaItems' query type */
export interface IGetAllMediaItemsQuery {
  params: IGetAllMediaItemsParams;
  result: IGetAllMediaItemsResult;
}

const getAllMediaItemsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT \n  m.id,\n  m.entity_id as "entityId",\n  m.document_id as "documentId",\n  m.file_path as "filePath",\n  m.file_type as "fileType",\n  m.title,\n  m.description,\n  m.is_sensitive as "isSensitive",\n  m.verification_status as "verificationStatus",\n  m.red_flag_rating as "redFlagRating",\n  m.metadata_json as "metadataJson",\n  m.created_at as "createdAt",\n  e.full_name as "entityName",\n  string_agg(DISTINCT p.full_name, \',\') as "relatedEntities"\nFROM media_items m\nLEFT JOIN entities e ON m.entity_id = e.id\nLEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text\nLEFT JOIN entities p ON mip.entity_id = p.id\nGROUP BY m.id, e.full_name\nORDER BY m.red_flag_rating DESC, m.created_at DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   m.id,
 *   m.entity_id as "entityId",
 *   m.document_id as "documentId",
 *   m.file_path as "filePath",
 *   m.file_type as "fileType",
 *   m.title,
 *   m.description,
 *   m.is_sensitive as "isSensitive",
 *   m.verification_status as "verificationStatus",
 *   m.red_flag_rating as "redFlagRating",
 *   m.metadata_json as "metadataJson",
 *   m.created_at as "createdAt",
 *   e.full_name as "entityName",
 *   string_agg(DISTINCT p.full_name, ',') as "relatedEntities"
 * FROM media_items m
 * LEFT JOIN entities e ON m.entity_id = e.id
 * LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
 * LEFT JOIN entities p ON mip.entity_id = p.id
 * GROUP BY m.id, e.full_name
 * ORDER BY m.red_flag_rating DESC, m.created_at DESC
 * ```
 */
export const getAllMediaItems = new PreparedQuery<IGetAllMediaItemsParams, IGetAllMediaItemsResult>(
  getAllMediaItemsIR,
);

/** 'GetMediaItemById' parameters type */
export interface IGetMediaItemByIdParams {
  id: string;
}

/** 'GetMediaItemById' return type */
export interface IGetMediaItemByIdResult {
  createdAt: Date | null;
  dateTaken: Date | null;
  description: string | null;
  documentId: string | null;
  entityId: string | null;
  filePath: string;
  fileSize: string | null;
  fileType: string | null;
  height: number | null;
  id: string;
  isSensitive: boolean | null;
  metadataJson: Json | null;
  redFlagRating: number | null;
  thumbnailPath: string | null;
  title: string | null;
  verificationStatus: string | null;
  width: number | null;
}

/** 'GetMediaItemById' query type */
export interface IGetMediaItemByIdQuery {
  params: IGetMediaItemByIdParams;
  result: IGetMediaItemByIdResult;
}

const getMediaItemByIdIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 470, b: 473 }] },
  ],
  statement:
    'SELECT\n  id,\n  entity_id as "entityId",\n  document_id as "documentId",\n  file_path as "filePath",\n  thumbnail_path as "thumbnailPath",\n  file_type as "fileType",\n  file_size as "fileSize",\n  width,\n  height,\n  title,\n  description,\n  is_sensitive as "isSensitive",\n  verification_status as "verificationStatus",\n  red_flag_rating as "redFlagRating",\n  metadata_json as "metadataJson",\n  date_taken as "dateTaken",\n  created_at as "createdAt"\nFROM media_items\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   entity_id as "entityId",
 *   document_id as "documentId",
 *   file_path as "filePath",
 *   thumbnail_path as "thumbnailPath",
 *   file_type as "fileType",
 *   file_size as "fileSize",
 *   width,
 *   height,
 *   title,
 *   description,
 *   is_sensitive as "isSensitive",
 *   verification_status as "verificationStatus",
 *   red_flag_rating as "redFlagRating",
 *   metadata_json as "metadataJson",
 *   date_taken as "dateTaken",
 *   created_at as "createdAt"
 * FROM media_items
 * WHERE id = :id!
 * ```
 */
export const getMediaItemById = new PreparedQuery<IGetMediaItemByIdParams, IGetMediaItemByIdResult>(
  getMediaItemByIdIR,
);

/** 'GetPhotosForEntities' parameters type */
export interface IGetPhotosForEntitiesParams {
  entityIds: NumberOrString;
}

/** 'GetPhotosForEntities' return type */
export interface IGetPhotosForEntitiesResult {
  entityId: string | null;
  filePath: string;
  id: string;
  isSensitive: boolean | null;
  redFlagRating: number | null;
  rn: string | null;
  title: string | null;
}

/** 'GetPhotosForEntities' query type */
export interface IGetPhotosForEntitiesQuery {
  params: IGetPhotosForEntitiesParams;
  result: IGetPhotosForEntitiesResult;
}

const getPhotosForEntitiesIR: any = {
  usedParamSet: { entityIds: true },
  params: [
    {
      name: 'entityIds',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 489, b: 499 },
        { a: 521, b: 531 },
      ],
    },
  ],
  statement:
    'SELECT * FROM (\n  SELECT DISTINCT\n    m.id,\n    COALESCE(mip.entity_id, m.entity_id) as "entityId",\n    m.file_path as "filePath",\n    m.title,\n    m.is_sensitive as "isSensitive",\n    m.red_flag_rating as "redFlagRating",\n    ROW_NUMBER() OVER (\n      PARTITION BY COALESCE(mip.entity_id, m.entity_id) \n      ORDER BY m.red_flag_rating DESC, m.created_at DESC\n    ) as rn\n  FROM media_items m\n  LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text\n  WHERE (mip.entity_id IN (:entityIds!) OR m.entity_id IN (:entityIds!))\n    AND m.file_type LIKE \'image/%\'\n) t WHERE rn <= 5',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM (
 *   SELECT DISTINCT
 *     m.id,
 *     COALESCE(mip.entity_id, m.entity_id) as "entityId",
 *     m.file_path as "filePath",
 *     m.title,
 *     m.is_sensitive as "isSensitive",
 *     m.red_flag_rating as "redFlagRating",
 *     ROW_NUMBER() OVER (
 *       PARTITION BY COALESCE(mip.entity_id, m.entity_id)
 *       ORDER BY m.red_flag_rating DESC, m.created_at DESC
 *     ) as rn
 *   FROM media_items m
 *   LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
 *   WHERE (mip.entity_id IN (:entityIds!) OR m.entity_id IN (:entityIds!))
 *     AND m.file_type LIKE 'image/%'
 * ) t WHERE rn <= 5
 * ```
 */
export const getPhotosForEntities = new PreparedQuery<
  IGetPhotosForEntitiesParams,
  IGetPhotosForEntitiesResult
>(getPhotosForEntitiesIR);

/** 'CountMediaItems' parameters type */
export interface ICountMediaItemsParams {
  entityId?: NumberOrString | null | void;
  fileType?: string | null | void;
  minRedFlag?: number | null | void;
}

/** 'CountMediaItems' return type */
export interface ICountMediaItemsResult {
  total: number | null;
}

/** 'CountMediaItems' query type */
export interface ICountMediaItemsQuery {
  params: ICountMediaItemsParams;
  result: ICountMediaItemsResult;
}

const countMediaItemsIR: any = {
  usedParamSet: { entityId: true, fileType: true, minRedFlag: true },
  params: [
    {
      name: 'entityId',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 60, b: 68 },
        { a: 103, b: 111 },
      ],
    },
    {
      name: 'fileType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 121, b: 129 },
        { a: 165, b: 173 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 183, b: 193 },
        { a: 232, b: 242 },
      ],
    },
  ],
  statement:
    'SELECT COUNT(*)::integer as total\nFROM media_items m\nWHERE (:entityId::bigint IS NULL OR m.entity_id = :entityId)\n  AND (:fileType::text IS NULL OR m.file_type LIKE :fileType)\n  AND (:minRedFlag::int IS NULL OR m.red_flag_rating >= :minRedFlag)',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::integer as total
 * FROM media_items m
 * WHERE (:entityId::bigint IS NULL OR m.entity_id = :entityId)
 *   AND (:fileType::text IS NULL OR m.file_type LIKE :fileType)
 *   AND (:minRedFlag::int IS NULL OR m.red_flag_rating >= :minRedFlag)
 * ```
 */
export const countMediaItems = new PreparedQuery<ICountMediaItemsParams, ICountMediaItemsResult>(
  countMediaItemsIR,
);

/** 'SearchPaginatedMedia' parameters type */
export interface ISearchPaginatedMediaParams {
  entityId?: NumberOrString | null | void;
  fileType?: string | null | void;
  limit: NumberOrString;
  minRedFlag?: number | null | void;
  offset: NumberOrString;
}

/** 'SearchPaginatedMedia' return type */
export interface ISearchPaginatedMediaResult {
  albumId: string | null;
  createdAt: Date | null;
  dateTaken: Date | null;
  description: string | null;
  documentId: string | null;
  entityId: string | null;
  filePath: string;
  fileSize: string | null;
  fileType: string | null;
  height: number | null;
  id: string;
  isSensitive: boolean | null;
  metadataJson: Json | null;
  people: string | null;
  redFlagRating: number | null;
  thumbnailPath: string | null;
  title: string | null;
  verificationStatus: string | null;
  width: number | null;
}

/** 'SearchPaginatedMedia' query type */
export interface ISearchPaginatedMediaQuery {
  params: ISearchPaginatedMediaParams;
  result: ISearchPaginatedMediaResult;
}

const searchPaginatedMediaIR: any = {
  usedParamSet: { entityId: true, fileType: true, minRedFlag: true, limit: true, offset: true },
  params: [
    {
      name: 'entityId',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 704, b: 712 },
        { a: 747, b: 755 },
      ],
    },
    {
      name: 'fileType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 765, b: 773 },
        { a: 809, b: 817 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 827, b: 837 },
        { a: 876, b: 886 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 960, b: 966 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 975, b: 982 }] },
  ],
  statement:
    'SELECT \n  m.id,\n  m.entity_id as "entityId",\n  m.document_id as "documentId",\n  m.file_path as "filePath",\n  m.thumbnail_path as "thumbnailPath",\n  m.file_type as "fileType",\n  m.file_size as "fileSize",\n  m.width,\n  m.height,\n  m.title,\n  m.description,\n  m.album_id as "albumId",\n  m.is_sensitive as "isSensitive",\n  m.verification_status as "verificationStatus",\n  m.red_flag_rating as "redFlagRating",\n  m.metadata_json as "metadataJson",\n  m.date_taken as "dateTaken",\n  m.created_at as "createdAt",\n  string_agg(DISTINCT e.id || \':\' || e.full_name, \',\') as people\nFROM media_items m\nLEFT JOIN media_item_people mp ON m.id = mp.media_item_id::text\nLEFT JOIN entities e ON mp.entity_id = e.id\nWHERE (:entityId::bigint IS NULL OR m.entity_id = :entityId)\n  AND (:fileType::text IS NULL OR m.file_type LIKE :fileType)\n  AND (:minRedFlag::int IS NULL OR m.red_flag_rating >= :minRedFlag)\nGROUP BY m.id\nORDER BY m.red_flag_rating DESC, m.created_at DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   m.id,
 *   m.entity_id as "entityId",
 *   m.document_id as "documentId",
 *   m.file_path as "filePath",
 *   m.thumbnail_path as "thumbnailPath",
 *   m.file_type as "fileType",
 *   m.file_size as "fileSize",
 *   m.width,
 *   m.height,
 *   m.title,
 *   m.description,
 *   m.album_id as "albumId",
 *   m.is_sensitive as "isSensitive",
 *   m.verification_status as "verificationStatus",
 *   m.red_flag_rating as "redFlagRating",
 *   m.metadata_json as "metadataJson",
 *   m.date_taken as "dateTaken",
 *   m.created_at as "createdAt",
 *   string_agg(DISTINCT e.id || ':' || e.full_name, ',') as people
 * FROM media_items m
 * LEFT JOIN media_item_people mp ON m.id = mp.media_item_id::text
 * LEFT JOIN entities e ON mp.entity_id = e.id
 * WHERE (:entityId::bigint IS NULL OR m.entity_id = :entityId)
 *   AND (:fileType::text IS NULL OR m.file_type LIKE :fileType)
 *   AND (:minRedFlag::int IS NULL OR m.red_flag_rating >= :minRedFlag)
 * GROUP BY m.id
 * ORDER BY m.red_flag_rating DESC, m.created_at DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const searchPaginatedMedia = new PreparedQuery<
  ISearchPaginatedMediaParams,
  ISearchPaginatedMediaResult
>(searchPaginatedMediaIR);
