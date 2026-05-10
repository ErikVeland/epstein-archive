/** Types generated for queries found in "src/queries/articles.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'InsertArticle' parameters type */
export interface IInsertArticleParams {
  author?: string | null | void;
  content?: string | null | void;
  description?: string | null | void;
  guid?: string | null | void;
  imageUrl?: string | null | void;
  link: string;
  pubDate?: DateOrString | null | void;
  redFlagRating?: number | null | void;
  source?: string | null | void;
  title: string;
}

/** 'InsertArticle' return type */
export type IInsertArticleResult = void;

/** 'InsertArticle' query type */
export interface IInsertArticleQuery {
  params: IInsertArticleParams;
  result: IInsertArticleResult;
}

const insertArticleIR: any = {
  usedParamSet: {
    title: true,
    link: true,
    description: true,
    content: true,
    pubDate: true,
    author: true,
    source: true,
    imageUrl: true,
    guid: true,
    redFlagRating: true,
  },
  params: [
    { name: 'title', required: true, transform: { type: 'scalar' }, locs: [{ a: 132, b: 138 }] },
    { name: 'link', required: true, transform: { type: 'scalar' }, locs: [{ a: 141, b: 146 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 149, b: 160 }],
    },
    { name: 'content', required: false, transform: { type: 'scalar' }, locs: [{ a: 163, b: 170 }] },
    { name: 'pubDate', required: false, transform: { type: 'scalar' }, locs: [{ a: 173, b: 180 }] },
    { name: 'author', required: false, transform: { type: 'scalar' }, locs: [{ a: 183, b: 189 }] },
    { name: 'source', required: false, transform: { type: 'scalar' }, locs: [{ a: 192, b: 198 }] },
    {
      name: 'imageUrl',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 201, b: 209 }],
    },
    { name: 'guid', required: false, transform: { type: 'scalar' }, locs: [{ a: 212, b: 216 }] },
    {
      name: 'redFlagRating',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 219, b: 232 }],
    },
  ],
  statement:
    'INSERT INTO articles (\n  title, link, description, content, pub_date, author, source, image_url, guid, red_flag_rating\n) VALUES (\n  :title!, :link!, :description, :content, :pubDate, :author, :source, :imageUrl, :guid, :redFlagRating\n)\nON CONFLICT(link) DO UPDATE SET\n  title = EXCLUDED.title,\n  description = EXCLUDED.description,\n  content = EXCLUDED.content,\n  updated_at = CURRENT_TIMESTAMP',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO articles (
 *   title, link, description, content, pub_date, author, source, image_url, guid, red_flag_rating
 * ) VALUES (
 *   :title!, :link!, :description, :content, :pubDate, :author, :source, :imageUrl, :guid, :redFlagRating
 * )
 * ON CONFLICT(link) DO UPDATE SET
 *   title = EXCLUDED.title,
 *   description = EXCLUDED.description,
 *   content = EXCLUDED.content,
 *   updated_at = CURRENT_TIMESTAMP
 * ```
 */
export const insertArticle = new PreparedQuery<IInsertArticleParams, IInsertArticleResult>(
  insertArticleIR,
);

/** 'GetArticles' parameters type */
export interface IGetArticlesParams {
  limit: NumberOrString;
  offset: NumberOrString;
  publication?: string | null | void;
  search?: string | null | void;
  sortBy?: string | null | void;
}

/** 'GetArticles' return type */
export interface IGetArticlesResult {
  author: string | null;
  content: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  imageUrl: string | null;
  link: string | null;
  pubDate: Date | null;
  redFlagRating: number | null;
  source: string | null;
  title: string;
}

/** 'GetArticles' query type */
export interface IGetArticlesQuery {
  params: IGetArticlesParams;
  result: IGetArticlesResult;
}

const getArticlesIR: any = {
  usedParamSet: { search: true, publication: true, sortBy: true, limit: true, offset: true },
  params: [
    {
      name: 'search',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 217, b: 223 },
        { a: 259, b: 265 },
        { a: 293, b: 299 },
        { a: 320, b: 326 },
      ],
    },
    {
      name: 'publication',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 336, b: 347 },
        { a: 380, b: 391 },
        { a: 415, b: 426 },
      ],
    },
    { name: 'sortBy', required: false, transform: { type: 'scalar' }, locs: [{ a: 451, b: 457 }] },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 530, b: 536 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 545, b: 552 }] },
  ],
  statement:
    'SELECT \n  id,\n  title,\n  link,\n  author,\n  source,\n  pub_date as "pubDate",\n  description,\n  content,\n  image_url as "imageUrl",\n  red_flag_rating as "redFlagRating",\n  created_at as "createdAt"\nFROM articles \nWHERE (:search::text IS NULL \n    OR title ILIKE :search \n    OR description ILIKE :search \n    OR tags ILIKE :search)\n  AND (:publication::text IS NULL \n    OR source = :publication \n    OR publication = :publication)\nORDER BY \n  CASE WHEN :sortBy::text = \'redFlag\' THEN red_flag_rating END DESC,\n  pub_date DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   title,
 *   link,
 *   author,
 *   source,
 *   pub_date as "pubDate",
 *   description,
 *   content,
 *   image_url as "imageUrl",
 *   red_flag_rating as "redFlagRating",
 *   created_at as "createdAt"
 * FROM articles
 * WHERE (:search::text IS NULL
 *     OR title ILIKE :search
 *     OR description ILIKE :search
 *     OR tags ILIKE :search)
 *   AND (:publication::text IS NULL
 *     OR source = :publication
 *     OR publication = :publication)
 * ORDER BY
 *   CASE WHEN :sortBy::text = 'redFlag' THEN red_flag_rating END DESC,
 *   pub_date DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getArticles = new PreparedQuery<IGetArticlesParams, IGetArticlesResult>(getArticlesIR);

/** 'CountArticles' parameters type */
export interface ICountArticlesParams {
  publication?: string | null | void;
  search?: string | null | void;
}

/** 'CountArticles' return type */
export interface ICountArticlesResult {
  total: number | null;
}

/** 'CountArticles' query type */
export interface ICountArticlesQuery {
  params: ICountArticlesParams;
  result: ICountArticlesResult;
}

const countArticlesIR: any = {
  usedParamSet: { search: true, publication: true },
  params: [
    {
      name: 'search',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 56, b: 62 },
        { a: 98, b: 104 },
        { a: 132, b: 138 },
        { a: 159, b: 165 },
      ],
    },
    {
      name: 'publication',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 175, b: 186 },
        { a: 219, b: 230 },
        { a: 254, b: 265 },
      ],
    },
  ],
  statement:
    'SELECT COUNT(*)::integer as total\nFROM articles \nWHERE (:search::text IS NULL \n    OR title ILIKE :search \n    OR description ILIKE :search \n    OR tags ILIKE :search)\n  AND (:publication::text IS NULL \n    OR source = :publication \n    OR publication = :publication)',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::integer as total
 * FROM articles
 * WHERE (:search::text IS NULL
 *     OR title ILIKE :search
 *     OR description ILIKE :search
 *     OR tags ILIKE :search)
 *   AND (:publication::text IS NULL
 *     OR source = :publication
 *     OR publication = :publication)
 * ```
 */
export const countArticles = new PreparedQuery<ICountArticlesParams, ICountArticlesResult>(
  countArticlesIR,
);

/** 'GetArticleById' parameters type */
export interface IGetArticleByIdParams {
  id: NumberOrString;
}

/** 'GetArticleById' return type */
export interface IGetArticleByIdResult {
  author: string | null;
  content: string | null;
  created_at: Date;
  description: string | null;
  guid: string | null;
  id: string;
  image_url: string | null;
  link: string | null;
  pub_date: Date | null;
  publication: string | null;
  reading_time: string | null;
  red_flag_rating: number | null;
  source: string | null;
  summary: string | null;
  tags: string | null;
  title: string;
  updated_at: Date;
}

/** 'GetArticleById' query type */
export interface IGetArticleByIdQuery {
  params: IGetArticleByIdParams;
  result: IGetArticleByIdResult;
}

const getArticleByIdIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 230, b: 233 }] },
  ],
  statement:
    'SELECT\n  id,\n  title,\n  link,\n  source,\n  publication,\n  pub_date,\n  description,\n  summary,\n  tags,\n  red_flag_rating,\n  image_url,\n  reading_time,\n  created_at,\n  updated_at,\n  content,\n  author,\n  guid\nFROM articles\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   title,
 *   link,
 *   source,
 *   publication,
 *   pub_date,
 *   description,
 *   summary,
 *   tags,
 *   red_flag_rating,
 *   image_url,
 *   reading_time,
 *   created_at,
 *   updated_at,
 *   content,
 *   author,
 *   guid
 * FROM articles
 * WHERE id = :id!
 * ```
 */
export const getArticleById = new PreparedQuery<IGetArticleByIdParams, IGetArticleByIdResult>(
  getArticleByIdIR,
);
