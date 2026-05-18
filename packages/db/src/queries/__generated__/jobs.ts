/** Types generated for queries found in "src/queries/jobs.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'CreateJob' parameters type */
export interface ICreateJobParams {
  runId: NumberOrString;
  stepName: string;
  targetId: NumberOrString;
  targetType: string;
}

/** 'CreateJob' return type */
export interface ICreateJobResult {
  id: string;
}

/** 'CreateJob' query type */
export interface ICreateJobQuery {
  params: ICreateJobParams;
  result: ICreateJobResult;
}

const createJobIR: any = {
  usedParamSet: { runId: true, stepName: true, targetType: true, targetId: true },
  params: [
    { name: 'runId', required: true, transform: { type: 'scalar' }, locs: [{ a: 80, b: 86 }] },
    { name: 'stepName', required: true, transform: { type: 'scalar' }, locs: [{ a: 89, b: 98 }] },
    {
      name: 'targetType',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 101, b: 112 }],
    },
    { name: 'targetId', required: true, transform: { type: 'scalar' }, locs: [{ a: 115, b: 124 }] },
  ],
  statement:
    'INSERT INTO processing_jobs (run_id, step_name, target_type, target_id)\nVALUES (:runId!, :stepName!, :targetType!, :targetId!)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO processing_jobs (run_id, step_name, target_type, target_id)
 * VALUES (:runId!, :stepName!, :targetType!, :targetId!)
 * RETURNING id
 * ```
 */
export const createJob = new PreparedQuery<ICreateJobParams, ICreateJobResult>(createJobIR);

/** Query 'ListJobs' is invalid, so its result is assigned type 'never'.
 *  */
export type IListJobsResult = never;

/** Query 'ListJobs' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IListJobsParams = never;

const listJobsIR: any = {
  usedParamSet: { status: true, targetType: true },
  params: [
    {
      name: 'status',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 198, b: 204 },
        { a: 232, b: 238 },
      ],
    },
    {
      name: 'targetType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 248, b: 258 },
        { a: 291, b: 301 },
      ],
    },
  ],
  statement:
    'SELECT\n  id,\n  run_id,\n  step_name,\n  target_type,\n  target_id,\n  status,\n  attempts,\n  max_attempts,\n  locked_by,\n  locked_at,\n  last_error,\n  created_at,\n  updated_at\nFROM processing_jobs \nWHERE (:status::text IS NULL OR status = :status)\n  AND (:targetType::text IS NULL OR target_type = :targetType)\nORDER BY priority DESC, created_at ASC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   run_id,
 *   step_name,
 *   target_type,
 *   target_id,
 *   status,
 *   attempts,
 *   max_attempts,
 *   locked_by,
 *   locked_at,
 *   last_error,
 *   created_at,
 *   updated_at
 * FROM processing_jobs
 * WHERE (:status::text IS NULL OR status = :status)
 *   AND (:targetType::text IS NULL OR target_type = :targetType)
 * ORDER BY priority DESC, created_at ASC
 * ```
 */
export const listJobs = new PreparedQuery<IListJobsParams, IListJobsResult>(listJobsIR);

/** 'UpdateJobStatus' parameters type */
export interface IUpdateJobStatusParams {
  error?: string | null | void;
  id: NumberOrString;
  status: string;
}

/** 'UpdateJobStatus' return type */
export type IUpdateJobStatusResult = void;

/** 'UpdateJobStatus' query type */
export interface IUpdateJobStatusQuery {
  params: IUpdateJobStatusParams;
  result: IUpdateJobStatusResult;
}

const updateJobStatusIR: any = {
  usedParamSet: { status: true, error: true, id: true },
  params: [
    { name: 'status', required: true, transform: { type: 'scalar' }, locs: [{ a: 37, b: 44 }] },
    { name: 'error', required: false, transform: { type: 'scalar' }, locs: [{ a: 60, b: 65 }] },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 135, b: 138 }] },
  ],
  statement:
    'UPDATE processing_jobs \nSET status = :status!, last_error = :error, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE processing_jobs
 * SET status = :status!, last_error = :error, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
 * WHERE id = :id!
 * ```
 */
export const updateJobStatus = new PreparedQuery<IUpdateJobStatusParams, IUpdateJobStatusResult>(
  updateJobStatusIR,
);

/** Query 'InsertJobAttempt' is invalid, so its result is assigned type 'never'.
 *  */
export type IInsertJobAttemptResult = never;

/** Query 'InsertJobAttempt' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IInsertJobAttemptParams = never;

const insertJobAttemptIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 145, b: 148 }] },
  ],
  statement:
    'INSERT INTO job_attempts (job_id, attempt_number, status, error_message)\nSELECT id, attempts, status, last_error FROM processing_jobs WHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO job_attempts (job_id, attempt_number, status, error_message)
 * SELECT id, attempts, status, last_error FROM processing_jobs WHERE id = :id!
 * ```
 */
export const insertJobAttempt = new PreparedQuery<IInsertJobAttemptParams, IInsertJobAttemptResult>(
  insertJobAttemptIR,
);

/** Query 'FindLeasableJob' is invalid, so its result is assigned type 'never'.
 *  */
export type IFindLeasableJobResult = never;

/** Query 'FindLeasableJob' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IFindLeasableJobParams = never;

const findLeasableJobIR: any = {
  usedParamSet: { leaseTimeMinutes: true },
  params: [
    {
      name: 'leaseTimeMinutes',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 105, b: 122 }],
    },
  ],
  statement:
    "SELECT id FROM processing_jobs \nWHERE (status = 'queued' OR (status = 'running' AND locked_at < NOW() - (:leaseTimeMinutes! * INTERVAL '1 minute')))\nORDER BY priority DESC, created_at ASC \nLIMIT 1\nFOR UPDATE SKIP LOCKED",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT id FROM processing_jobs
 * WHERE (status = 'queued' OR (status = 'running' AND locked_at < NOW() - (:leaseTimeMinutes! * INTERVAL '1 minute')))
 * ORDER BY priority DESC, created_at ASC
 * LIMIT 1
 * FOR UPDATE SKIP LOCKED
 * ```
 */
export const findLeasableJob = new PreparedQuery<IFindLeasableJobParams, IFindLeasableJobResult>(
  findLeasableJobIR,
);

/** 'LockJob' parameters type */
export interface ILockJobParams {
  id: NumberOrString;
  workerId: string;
}

/** 'LockJob' return type */
export interface ILockJobResult {
  attempts: number;
  created_at: Date;
  id: string;
  last_error: string | null;
  locked_at: Date | null;
  locked_by: string | null;
  max_attempts: number;
  run_id: string | null;
  status: string;
  step_name: string;
  target_id: string;
  target_type: string;
  updated_at: Date;
}

/** 'LockJob' query type */
export interface ILockJobQuery {
  params: ILockJobParams;
  result: ILockJobResult;
}

const lockJobIR: any = {
  usedParamSet: { workerId: true, id: true },
  params: [
    { name: 'workerId', required: true, transform: { type: 'scalar' }, locs: [{ a: 65, b: 74 }] },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 188, b: 191 }] },
  ],
  statement:
    "UPDATE processing_jobs \nSET status = 'running', \n    locked_by = :workerId!, \n    locked_at = CURRENT_TIMESTAMP,\n    attempts = attempts + 1,\n    updated_at = CURRENT_TIMESTAMP\nWHERE id = :id!\nRETURNING\n  id,\n  run_id,\n  step_name,\n  target_type,\n  target_id,\n  status,\n  attempts,\n  max_attempts,\n  locked_by,\n  locked_at,\n  last_error,\n  created_at,\n  updated_at",
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE processing_jobs
 * SET status = 'running',
 *     locked_by = :workerId!,
 *     locked_at = CURRENT_TIMESTAMP,
 *     attempts = attempts + 1,
 *     updated_at = CURRENT_TIMESTAMP
 * WHERE id = :id!
 * RETURNING
 *   id,
 *   run_id,
 *   step_name,
 *   target_type,
 *   target_id,
 *   status,
 *   attempts,
 *   max_attempts,
 *   locked_by,
 *   locked_at,
 *   last_error,
 *   created_at,
 *   updated_at
 * ```
 */
export const lockJob = new PreparedQuery<ILockJobParams, ILockJobResult>(lockJobIR);
