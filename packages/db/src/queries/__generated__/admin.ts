/** Types generated for queries found in "src/queries/admin.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetDbMeta' parameters type */
export type IGetDbMetaParams = void;

/** 'GetDbMeta' return type */
export interface IGetDbMetaResult {
  lockTimeout: string | null;
  serverVersion: string | null;
  statementTimeout: string | null;
}

/** 'GetDbMeta' query type */
export interface IGetDbMetaQuery {
  params: IGetDbMetaParams;
  result: IGetDbMetaResult;
}

const getDbMetaIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  version() AS "serverVersion",\n  current_setting(\'statement_timeout\') AS "statementTimeout",\n  current_setting(\'lock_timeout\') AS "lockTimeout"',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   version() AS "serverVersion",
 *   current_setting('statement_timeout') AS "statementTimeout",
 *   current_setting('lock_timeout') AS "lockTimeout"
 * ```
 */
export const getDbMeta = new PreparedQuery<IGetDbMetaParams, IGetDbMetaResult>(getDbMetaIR);

/** 'GetEntityAndDocumentCounts' parameters type */
export type IGetEntityAndDocumentCountsParams = void;

/** 'GetEntityAndDocumentCounts' return type */
export interface IGetEntityAndDocumentCountsResult {
  documents: number | null;
  entities: number | null;
}

/** 'GetEntityAndDocumentCounts' query type */
export interface IGetEntityAndDocumentCountsQuery {
  params: IGetEntityAndDocumentCountsParams;
  result: IGetEntityAndDocumentCountsResult;
}

const getEntityAndDocumentCountsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT \n  (SELECT COUNT(*)::integer FROM entities) as entities,\n  (SELECT COUNT(*)::integer FROM documents) as documents',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   (SELECT COUNT(*)::integer FROM entities) as entities,
 *   (SELECT COUNT(*)::integer FROM documents) as documents
 * ```
 */
export const getEntityAndDocumentCounts = new PreparedQuery<
  IGetEntityAndDocumentCountsParams,
  IGetEntityAndDocumentCountsResult
>(getEntityAndDocumentCountsIR);

/** 'ListUsers' parameters type */
export type IListUsersParams = void;

/** 'ListUsers' return type */
export interface IListUsersResult {
  createdAt: Date | null;
  email: string | null;
  id: string;
  lastActive: Date | null;
  role: string | null;
  username: string | null;
}

/** 'ListUsers' query type */
export interface IListUsersQuery {
  params: IListUsersParams;
  result: IListUsersResult;
}

const listUsersIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT id, username, email, role, created_at as "createdAt", last_active as "lastActive" \nFROM users \nORDER BY username ASC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, username, email, role, created_at as "createdAt", last_active as "lastActive"
 * FROM users
 * ORDER BY username ASC
 * ```
 */
export const listUsers = new PreparedQuery<IListUsersParams, IListUsersResult>(listUsersIR);

/** 'GetUserById' parameters type */
export interface IGetUserByIdParams {
  id: string;
}

/** 'GetUserById' return type */
export interface IGetUserByIdResult {
  createdAt: Date | null;
  email: string | null;
  id: string;
  lastActive: Date | null;
  role: string | null;
  username: string | null;
}

/** 'GetUserById' query type */
export interface IGetUserByIdQuery {
  params: IGetUserByIdParams;
  result: IGetUserByIdResult;
}

const getUserByIdIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 113, b: 116 }] },
  ],
  statement:
    'SELECT id, username, email, role, created_at as "createdAt", last_active as "lastActive" \nFROM users \nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, username, email, role, created_at as "createdAt", last_active as "lastActive"
 * FROM users
 * WHERE id = :id!
 * ```
 */
export const getUserById = new PreparedQuery<IGetUserByIdParams, IGetUserByIdResult>(getUserByIdIR);

/** 'CreateUser' parameters type */
export interface ICreateUserParams {
  email?: string | null | void;
  id: string;
  passwordHash: string;
  role: string;
  username: string;
}

/** 'CreateUser' return type */
export type ICreateUserResult = void;

/** 'CreateUser' query type */
export interface ICreateUserQuery {
  params: ICreateUserParams;
  result: ICreateUserResult;
}

const createUserIR: any = {
  usedParamSet: { id: true, username: true, email: true, role: true, passwordHash: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 94, b: 97 }] },
    { name: 'username', required: true, transform: { type: 'scalar' }, locs: [{ a: 100, b: 109 }] },
    { name: 'email', required: false, transform: { type: 'scalar' }, locs: [{ a: 112, b: 117 }] },
    { name: 'role', required: true, transform: { type: 'scalar' }, locs: [{ a: 120, b: 125 }] },
    {
      name: 'passwordHash',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 128, b: 141 }],
    },
  ],
  statement:
    'INSERT INTO users (id, username, email, role, password_hash, created_at, last_active)\nVALUES (:id!, :username!, :email, :role!, :passwordHash!, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO users (id, username, email, role, password_hash, created_at, last_active)
 * VALUES (:id!, :username!, :email, :role!, :passwordHash!, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
 * ```
 */
export const createUser = new PreparedQuery<ICreateUserParams, ICreateUserResult>(createUserIR);

/** 'UpdateUser' parameters type */
export interface IUpdateUserParams {
  email?: string | null | void;
  id: string;
  passwordHash?: string | null | void;
  role?: string | null | void;
  username?: string | null | void;
}

/** 'UpdateUser' return type */
export type IUpdateUserResult = void;

/** 'UpdateUser' query type */
export interface IUpdateUserQuery {
  params: IUpdateUserParams;
  result: IUpdateUserResult;
}

const updateUserIR: any = {
  usedParamSet: { username: true, email: true, role: true, passwordHash: true, id: true },
  params: [
    { name: 'username', required: false, transform: { type: 'scalar' }, locs: [{ a: 41, b: 49 }] },
    { name: 'email', required: false, transform: { type: 'scalar' }, locs: [{ a: 82, b: 87 }] },
    { name: 'role', required: false, transform: { type: 'scalar' }, locs: [{ a: 116, b: 120 }] },
    {
      name: 'passwordHash',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 157, b: 169 }],
    },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 198, b: 201 }] },
  ],
  statement:
    'UPDATE users \nSET \n  username = COALESCE(:username, username),\n  email = COALESCE(:email, email),\n  role = COALESCE(:role, role),\n  password_hash = COALESCE(:passwordHash, password_hash)\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE users
 * SET
 *   username = COALESCE(:username, username),
 *   email = COALESCE(:email, email),
 *   role = COALESCE(:role, role),
 *   password_hash = COALESCE(:passwordHash, password_hash)
 * WHERE id = :id!
 * ```
 */
export const updateUser = new PreparedQuery<IUpdateUserParams, IUpdateUserResult>(updateUserIR);

/** 'ResetJunkFlags' parameters type */
export type IResetJunkFlagsParams = void;

/** 'ResetJunkFlags' return type */
export type IResetJunkFlagsResult = void;

/** 'ResetJunkFlags' query type */
export interface IResetJunkFlagsQuery {
  params: IResetJunkFlagsParams;
  result: IResetJunkFlagsResult;
}

const resetJunkFlagsIR: any = {
  usedParamSet: {},
  params: [],
  statement: "UPDATE entities \nSET junk_tier = 'clean', junk_reason = NULL, junk_probability = 0",
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE entities
 * SET junk_tier = 'clean', junk_reason = NULL, junk_probability = 0
 * ```
 */
export const resetJunkFlags = new PreparedQuery<IResetJunkFlagsParams, IResetJunkFlagsResult>(
  resetJunkFlagsIR,
);
