import { ClientBase, ClientConfig, QueryResult } from 'pg';
import { DBConnection } from './db.js';
import { LogFn, Logger } from './logger.js';
import { MigrationBuilder } from './migrationBuilder.js';
import { a as ColumnDefinitions } from './migrationOptions-BgtOZlq1.js';

interface RunnerOptionConfig {
    /**
     * The table storing which migrations have been run.
     */
    migrationsTable: string;
    /**
     * The schema storing table which migrations have been run.
     *
     * (defaults to same value as `schema`)
     */
    migrationsSchema?: string;
    /**
     * The schema on which migration will be run.
     *
     * @default 'public'
     */
    schema?: string | string[];
    /**
     * The directory containing your migration files. This path is resolved from `cwd()`.
     * Alternatively, provide a [glob](https://www.npmjs.com/package/glob) pattern or
     * an array of glob patterns and set `useGlob = true`
     *
     * Note: enabling glob will read both, `dir` _and_ `ignorePattern` as glob patterns
     */
    dir: string | string[];
    /**
     * Use [glob](https://www.npmjs.com/package/glob) to find migration files.
     * This will use `dir` _and_ `ignorePattern` to glob-search for migration files.
     *
     * Note: enabling glob will read both, `dir` _and_ `ignorePattern` as glob patterns
     *
     * @default false
     */
    useGlob?: boolean;
    /**
     * Check order of migrations before running them.
     */
    checkOrder?: boolean;
    /**
     * Direction of migration-run.
     */
    direction: MigrationDirection;
    /**
     * Number of migration to run.
     */
    count?: number;
    /**
     * Treats `count` as timestamp.
     */
    timestamp?: boolean;
    /**
     * Regex pattern for file names to ignore (ignores files starting with `.` by default).
     * Alternatively, provide a [glob](https://www.npmjs.com/package/glob) pattern or
     * an array of glob patterns and set `isGlob = true`
     *
     * Note: enabling glob will read both, `dir` _and_ `ignorePattern` as glob patterns
     */
    ignorePattern?: string | string[];
    /**
     * Run only migration with this name.
     */
    file?: string;
    dryRun?: boolean;
    /**
     * Creates the configured schema if it doesn't exist.
     */
    createSchema?: boolean;
    /**
     * Creates the configured migration schema if it doesn't exist.
     */
    createMigrationsSchema?: boolean;
    /**
     * Combines all pending migrations into a single transaction so that if any migration fails, all will be rolled back.
     *
     * @default true
     */
    singleTransaction?: boolean;
    /**
     * Disables locking mechanism and checks.
     */
    noLock?: boolean;
    /**
     * Value to use for the lock.
     */
    lockValue?: number;
    /**
     * Mark migrations as run without actually performing them (use with caution!).
     */
    fake?: boolean;
    /**
     * Runs [`decamelize`](https://github.com/sindresorhus/decamelize) on table/column/etc. names.
     */
    decamelize?: boolean;
    /**
     * Redirect log messages to this function, rather than `console`.
     */
    log?: LogFn;
    /**
     * Redirect messages to this logger object, rather than `console`.
     */
    logger?: Logger;
    /**
     * Print all debug messages like DB queries run (if you switch it on, it will disable `logger.debug` method).
     */
    verbose?: boolean;
}
interface RunnerOptionUrl {
    /**
     * Connection string or client config which is passed to [new pg.Client](https://node-postgres.com/api/client#constructor)
     */
    databaseUrl: string | ClientConfig;
}
interface RunnerOptionClient {
    /**
     * Instance of [new pg.Client](https://node-postgres.com/api/client).
     *
     * Instance should be connected to DB and after finishing migration, user is responsible to close connection.
     */
    dbClient: ClientBase;
}
type RunnerOption = RunnerOptionConfig & (RunnerOptionClient | RunnerOptionUrl);
/**
 * Random but well-known identifier shared by all instances of `node-pg-migrate`.
 */
declare const PG_MIGRATE_LOCK_ID = 7241865325823964;
type MigrationDirection = 'up' | 'down';
declare function runner(options: RunnerOption): Promise<RunMigration[]>;

interface MigrationBuilderActions {
    up?: MigrationAction | false;
    down?: MigrationAction | false;
    shorthands?: ColumnDefinitions;
}
declare function getActions(content: string): MigrationBuilderActions;
declare function sqlMigration(sqlPath: string): Promise<MigrationBuilderActions>;

type MigrationAction = (pgm: MigrationBuilder, run?: () => void) => Promise<void> | void;
interface RunMigration {
    readonly path: string;
    readonly name: string;
    readonly timestamp: number;
}
declare const FilenameFormat: Readonly<{
    timestamp: "timestamp";
    utc: "utc";
}>;
type FilenameFormat = (typeof FilenameFormat)[keyof typeof FilenameFormat];
interface CreateOptionsTemplate {
    templateFileName: string;
}
interface CreateOptionsDefault {
    language?: 'js' | 'ts' | 'sql';
    ignorePattern?: string;
}
type CreateOptions = {
    filenameFormat?: FilenameFormat;
} & (CreateOptionsTemplate | CreateOptionsDefault);
interface LoadMigrationFilesOptions {
    /**
     * Regex pattern for file names to ignore (ignores files starting with `.` by default).
     * Alternatively, provide a [glob](https://www.npmjs.com/package/glob) pattern or
     * an array of glob patterns and set `isGlob = true`
     *
     * Note: enabling glob will read both, `dir` _and_ `ignorePattern` as glob patterns
     */
    ignorePattern?: string | string[];
    /**
     * Use [glob](https://www.npmjs.com/package/glob) to find migration files.
     * This will use `dir` _and_ `options.ignorePattern` to glob-search for migration files.
     *
     * @default: false
     */
    useGlob?: boolean;
    /**
     * Redirect messages to this logger object, rather than `console`.
     */
    logger?: Logger;
}
/**
 * Reads files from `dir`, sorts them and returns an array of their absolute paths.
 * When not using globs, files are sorted by their numeric prefix values first. 17 digit numbers are interpreted as utc date and converted to the number representation of that date.
 * Glob matches are sorted via String.localeCompare with ignored punctuation.
 *
 * @param dir The directory containing your migration files. This path is resolved from `cwd()`.
 * Alternatively, provide a [glob](https://www.npmjs.com/package/glob) pattern or
 * an array of glob patterns and set `options.useGlob = true`
 *
 * Note: enabling glob will read both, `dir` _and_ `options.ignorePattern` as glob patterns
 * @param options
 * @returns Array of absolute paths
 */
declare function getMigrationFilePaths(
/**
 * The directory containing your migration files. This path is resolved from `cwd()`.
 * Alternatively, provide a [glob](https://www.npmjs.com/package/glob) pattern or
 * an array of glob patterns and set `options.useGlob = true`
 *
 * Note: enabling glob will read both, `dir` _and_ `options.ignorePattern` as glob patterns
 */
dir: string | string[], options?: LoadMigrationFilesOptions): Promise<string[]>;
/**
 * extracts numeric value from everything in `filename` before `SEPARATOR`.
 * 17 digit numbers are interpreted as utc date and converted to the number representation of that date.
 * @param filename filename to extract the prefix from
 * @param logger Redirect messages to this logger object, rather than `console`.
 * @returns numeric value of the filename prefix (everything before `SEPARATOR`).
 */
declare function getNumericPrefix(filename: string, logger?: Logger): number;
declare class Migration implements RunMigration {
    static create(name: string, directory: string, options?: CreateOptions): Promise<string>;
    readonly db: DBConnection;
    readonly path: string;
    readonly name: string;
    readonly timestamp: number;
    up?: false | MigrationAction;
    down?: false | MigrationAction;
    readonly options: RunnerOption;
    readonly typeShorthands?: ColumnDefinitions;
    readonly logger: Logger;
    constructor(db: DBConnection, migrationPath: string, { up, down }: MigrationBuilderActions, options: RunnerOption, typeShorthands?: ColumnDefinitions, logger?: Logger);
    _getMarkAsRun(action: MigrationAction): string;
    _apply(action: MigrationAction, pgm: MigrationBuilder): Promise<unknown>;
    _getAction(direction: MigrationDirection): MigrationAction;
    apply(direction: MigrationDirection): Promise<unknown>;
    markAsRun(direction: MigrationDirection): Promise<QueryResult>;
}

export { type CreateOptionsTemplate as C, FilenameFormat as F, Migration as M, PG_MIGRATE_LOCK_ID as P, type RunnerOption as R, type RunnerOptionConfig as a, type RunnerOptionUrl as b, type RunnerOptionClient as c, type MigrationDirection as d, type MigrationBuilderActions as e, type MigrationAction as f, getActions as g, type RunMigration as h, type CreateOptionsDefault as i, type CreateOptions as j, getMigrationFilePaths as k, getNumericPrefix as l, runner as r, sqlMigration as s };
