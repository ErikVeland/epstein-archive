/** Types generated for queries found in "src/queries/black_book.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetBlackBookEntries' parameters type */
export interface IGetBlackBookEntriesParams {
  hasPhone?: boolean | null | void;
  letter?: string | null | void;
  limit: NumberOrString;
  search?: string | null | void;
}

/** 'GetBlackBookEntries' return type */
export interface IGetBlackBookEntriesResult {
  addresses: string | null;
  displayName: string | null;
  documentId: string | null;
  emailAddresses: string | null;
  entryCategory: string | null;
  entryText: string | null;
  id: number;
  notes: string | null;
  personId: string | null;
  personName: string;
  phoneNumbers: string | null;
}

/** 'GetBlackBookEntries' query type */
export interface IGetBlackBookEntriesQuery {
  params: IGetBlackBookEntriesParams;
  result: IGetBlackBookEntriesResult;
}

const getBlackBookEntriesIR: any = {
  usedParamSet: { letter: true, search: true, hasPhone: true, limit: true },
  params: [
    {
      name: 'letter',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 583, b: 589 },
        { a: 674, b: 680 },
      ],
    },
    {
      name: 'search',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 697, b: 703 },
        { a: 757, b: 763 },
        { a: 817, b: 823 },
        { a: 879, b: 885 },
        { a: 935, b: 941 },
      ],
    },
    {
      name: 'hasPhone',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 962, b: 970 }],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 1092, b: 1098 }] },
  ],
  statement:
    'SELECT\n  bb.id,\n  bb.person_id as "personId",\n  bb.entry_text as "entryText",\n  bb.phone_numbers as "phoneNumbers",\n  bb.addresses,\n  bb.email_addresses as "emailAddresses",\n  bb.notes,\n  bb.entry_category as "entryCategory",\n  bb.document_id as "documentId",\n  p.full_name as "personName",\n  COALESCE(p.full_name, TRIM(SUBSTR(bb.entry_text, 1, \n    CASE \n      WHEN strpos(bb.entry_text, chr(10)) > 0 THEN strpos(bb.entry_text, chr(10)) - 1 \n      ELSE length(bb.entry_text) \n    END))) as "displayName"\nFROM black_book_entries bb\nLEFT JOIN entities p ON bb.person_id = p.id\nWHERE (:letter::text IS NULL OR UPPER(SUBSTR(COALESCE(p.full_name, bb.entry_text), 1, 1)) = UPPER(:letter::text))\n  AND (:search::text IS NULL OR (\n      bb.entry_text ILIKE \'%\' || :search || \'%\' OR\n      bb.phone_numbers::text ILIKE \'%\' || :search || \'%\' OR\n      bb.email_addresses::text ILIKE \'%\' || :search || \'%\' OR\n      bb.addresses::text ILIKE \'%\' || :search || \'%\'\n  ))\n  AND (:hasPhone::boolean IS NULL OR (bb.phone_numbers IS NOT NULL AND bb.phone_numbers::text <> \'[]\'))\nORDER BY "displayName" ASC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   bb.id,
 *   bb.person_id as "personId",
 *   bb.entry_text as "entryText",
 *   bb.phone_numbers as "phoneNumbers",
 *   bb.addresses,
 *   bb.email_addresses as "emailAddresses",
 *   bb.notes,
 *   bb.entry_category as "entryCategory",
 *   bb.document_id as "documentId",
 *   p.full_name as "personName",
 *   COALESCE(p.full_name, TRIM(SUBSTR(bb.entry_text, 1,
 *     CASE
 *       WHEN strpos(bb.entry_text, chr(10)) > 0 THEN strpos(bb.entry_text, chr(10)) - 1
 *       ELSE length(bb.entry_text)
 *     END))) as "displayName"
 * FROM black_book_entries bb
 * LEFT JOIN entities p ON bb.person_id = p.id
 * WHERE (:letter::text IS NULL OR UPPER(SUBSTR(COALESCE(p.full_name, bb.entry_text), 1, 1)) = UPPER(:letter::text))
 *   AND (:search::text IS NULL OR (
 *       bb.entry_text ILIKE '%' || :search || '%' OR
 *       bb.phone_numbers::text ILIKE '%' || :search || '%' OR
 *       bb.email_addresses::text ILIKE '%' || :search || '%' OR
 *       bb.addresses::text ILIKE '%' || :search || '%'
 *   ))
 *   AND (:hasPhone::boolean IS NULL OR (bb.phone_numbers IS NOT NULL AND bb.phone_numbers::text <> '[]'))
 * ORDER BY "displayName" ASC
 * LIMIT :limit!
 * ```
 */
export const getBlackBookEntries = new PreparedQuery<
  IGetBlackBookEntriesParams,
  IGetBlackBookEntriesResult
>(getBlackBookEntriesIR);

/** 'GetBlackBookReviewStats' parameters type */
export type IGetBlackBookReviewStatsParams = void;

/** 'GetBlackBookReviewStats' return type */
export interface IGetBlackBookReviewStatsResult {
  remaining: string | null;
  reviewed: string | null;
  total: number | null;
}

/** 'GetBlackBookReviewStats' query type */
export interface IGetBlackBookReviewStatsQuery {
  params: IGetBlackBookReviewStatsParams;
  result: IGetBlackBookReviewStatsResult;
}

const getBlackBookReviewStatsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT \n  COUNT(*)::integer as total,\n  COUNT(CASE WHEN needs_review = 1 THEN 1 END) as remaining,\n  COUNT(CASE WHEN needs_review = 0 OR manually_reviewed = 1 THEN 1 END) as reviewed\nFROM entities\nWHERE id IN (SELECT person_id FROM black_book_entries)',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COUNT(*)::integer as total,
 *   COUNT(CASE WHEN needs_review = 1 THEN 1 END) as remaining,
 *   COUNT(CASE WHEN needs_review = 0 OR manually_reviewed = 1 THEN 1 END) as reviewed
 * FROM entities
 * WHERE id IN (SELECT person_id FROM black_book_entries)
 * ```
 */
export const getBlackBookReviewStats = new PreparedQuery<
  IGetBlackBookReviewStatsParams,
  IGetBlackBookReviewStatsResult
>(getBlackBookReviewStatsIR);

/** 'UpdateBlackBookReview' parameters type */
export interface IUpdateBlackBookReviewParams {
  fullName: string;
  id: NumberOrString;
}

/** 'UpdateBlackBookReview' return type */
export type IUpdateBlackBookReviewResult = void;

/** 'UpdateBlackBookReview' query type */
export interface IUpdateBlackBookReviewQuery {
  params: IUpdateBlackBookReviewParams;
  result: IUpdateBlackBookReviewResult;
}

const updateBlackBookReviewIR: any = {
  usedParamSet: { fullName: true, id: true },
  params: [
    { name: 'fullName', required: true, transform: { type: 'scalar' }, locs: [{ a: 33, b: 42 }] },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 96, b: 99 }] },
  ],
  statement:
    'UPDATE entities \nSET full_name = :fullName!, needs_review = 0, manually_reviewed = 1\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE entities
 * SET full_name = :fullName!, needs_review = 0, manually_reviewed = 1
 * WHERE id = :id!
 * ```
 */
export const updateBlackBookReview = new PreparedQuery<
  IUpdateBlackBookReviewParams,
  IUpdateBlackBookReviewResult
>(updateBlackBookReviewIR);

/** 'GetBlackBookSourceEntries' parameters type */
export interface IGetBlackBookSourceEntriesParams {
  category: string;
  hasAddress?: boolean | null | void;
  hasEmail?: boolean | null | void;
  hasPhone?: boolean | null | void;
  limit: NumberOrString;
  search?: string | null | void;
}

/** 'GetBlackBookSourceEntries' return type */
export interface IGetBlackBookSourceEntriesResult {
  addresses: string | null;
  documentId: string | null;
  emailAddresses: string | null;
  entryCategory: string | null;
  entryText: string | null;
  id: number;
  notes: string | null;
  pageNumber: number | null;
  personId: string | null;
  phoneNumbers: string | null;
}

/** 'GetBlackBookSourceEntries' query type */
export interface IGetBlackBookSourceEntriesQuery {
  params: IGetBlackBookSourceEntriesParams;
  result: IGetBlackBookSourceEntriesResult;
}

const getBlackBookSourceEntriesIR: any = {
  usedParamSet: {
    category: true,
    search: true,
    hasPhone: true,
    hasEmail: true,
    hasAddress: true,
    limit: true,
  },
  params: [
    { name: 'category', required: true, transform: { type: 'scalar' }, locs: [{ a: 332, b: 341 }] },
    {
      name: 'search',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 350, b: 356 },
        { a: 402, b: 408 },
      ],
    },
    {
      name: 'hasPhone',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 425, b: 433 }],
    },
    {
      name: 'hasEmail',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 527, b: 535 }],
    },
    {
      name: 'hasAddress',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 633, b: 643 }],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 743, b: 749 }] },
  ],
  statement:
    'SELECT bb.id, bb.person_id AS "personId", bb.entry_text AS "entryText",\n  bb.phone_numbers AS "phoneNumbers", bb.addresses, bb.email_addresses AS "emailAddresses",\n  bb.notes, bb.entry_category AS "entryCategory", bb.document_id AS "documentId",\n  bb.page_number AS "pageNumber"\nFROM black_book_entries bb\nWHERE bb.entry_category = :category!\n  AND (:search::text IS NULL OR bb.entry_text ILIKE \'%\' || :search || \'%\')\n  AND (:hasPhone::boolean IS NOT TRUE OR (bb.phone_numbers IS NOT NULL AND bb.phone_numbers <> \'[]\'))\n  AND (:hasEmail::boolean IS NOT TRUE OR (bb.email_addresses IS NOT NULL AND bb.email_addresses <> \'[]\'))\n  AND (:hasAddress::boolean IS NOT TRUE OR (bb.addresses IS NOT NULL AND bb.addresses <> \'[]\'))\nORDER BY bb.id\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT bb.id, bb.person_id AS "personId", bb.entry_text AS "entryText",
 *   bb.phone_numbers AS "phoneNumbers", bb.addresses, bb.email_addresses AS "emailAddresses",
 *   bb.notes, bb.entry_category AS "entryCategory", bb.document_id AS "documentId",
 *   bb.page_number AS "pageNumber"
 * FROM black_book_entries bb
 * WHERE bb.entry_category = :category!
 *   AND (:search::text IS NULL OR bb.entry_text ILIKE '%' || :search || '%')
 *   AND (:hasPhone::boolean IS NOT TRUE OR (bb.phone_numbers IS NOT NULL AND bb.phone_numbers <> '[]'))
 *   AND (:hasEmail::boolean IS NOT TRUE OR (bb.email_addresses IS NOT NULL AND bb.email_addresses <> '[]'))
 *   AND (:hasAddress::boolean IS NOT TRUE OR (bb.addresses IS NOT NULL AND bb.addresses <> '[]'))
 * ORDER BY bb.id
 * LIMIT :limit!
 * ```
 */
export const getBlackBookSourceEntries = new PreparedQuery<
  IGetBlackBookSourceEntriesParams,
  IGetBlackBookSourceEntriesResult
>(getBlackBookSourceEntriesIR);

/** 'GetBlackBookIdentityIndex' parameters type */
export type IGetBlackBookIdentityIndexParams = void;

/** 'GetBlackBookIdentityIndex' return type */
export interface IGetBlackBookIdentityIndexResult {
  fullName: string;
  id: string;
  isVip: number | null;
  primaryRole: string | null;
  thumbnailPath: string | null;
}

/** 'GetBlackBookIdentityIndex' query type */
export interface IGetBlackBookIdentityIndexQuery {
  params: IGetBlackBookIdentityIndexParams;
  result: IGetBlackBookIdentityIndexResult;
}

const getBlackBookIdentityIndexIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "WITH portraits AS (\n  SELECT DISTINCT ON (fc.entity_id) fc.entity_id, f.crop_path\n  FROM face_clusters fc\n  JOIN faces f ON f.id = fc.representative_face_id\n  JOIN media_items m ON m.id = f.media_item_id::text\n  WHERE fc.entity_id IS NOT NULL AND fc.is_hidden = false\n    AND m.verification_status IN ('verified', 'source_verified')\n    AND COALESCE(m.is_sensitive, false) = false\n  ORDER BY fc.entity_id, fc.id\n)\nSELECT e.id, e.full_name AS \"fullName\", e.is_vip AS \"isVip\",\n  e.primary_role AS \"primaryRole\",\n  portraits.crop_path AS \"thumbnailPath\"\nFROM entities e\nLEFT JOIN portraits ON portraits.entity_id = e.id\nWHERE (e.is_vip = 1 OR e.manually_reviewed = 1)\n  AND COALESCE(e.quarantine_status, 0) = 0\n  AND COALESCE(e.junk_tier, 'clean') = 'clean'\n  AND lower(COALESCE(e.entity_type, '')) = 'person'\n  AND COALESCE(e.primary_role, '') !~* 'victim|survivor|minor'\n  AND e.full_name IS NOT NULL",
};

/**
 * Query generated from SQL:
 * ```
 * WITH portraits AS (
 *   SELECT DISTINCT ON (fc.entity_id) fc.entity_id, f.crop_path
 *   FROM face_clusters fc
 *   JOIN faces f ON f.id = fc.representative_face_id
 *   JOIN media_items m ON m.id = f.media_item_id::text
 *   WHERE fc.entity_id IS NOT NULL AND fc.is_hidden = false
 *     AND m.verification_status IN ('verified', 'source_verified')
 *     AND COALESCE(m.is_sensitive, false) = false
 *   ORDER BY fc.entity_id, fc.id
 * )
 * SELECT e.id, e.full_name AS "fullName", e.is_vip AS "isVip",
 *   e.primary_role AS "primaryRole",
 *   portraits.crop_path AS "thumbnailPath"
 * FROM entities e
 * LEFT JOIN portraits ON portraits.entity_id = e.id
 * WHERE (e.is_vip = 1 OR e.manually_reviewed = 1)
 *   AND COALESCE(e.quarantine_status, 0) = 0
 *   AND COALESCE(e.junk_tier, 'clean') = 'clean'
 *   AND lower(COALESCE(e.entity_type, '')) = 'person'
 *   AND COALESCE(e.primary_role, '') !~* 'victim|survivor|minor'
 *   AND e.full_name IS NOT NULL
 * ```
 */
export const getBlackBookIdentityIndex = new PreparedQuery<
  IGetBlackBookIdentityIndexParams,
  IGetBlackBookIdentityIndexResult
>(getBlackBookIdentityIndexIR);
