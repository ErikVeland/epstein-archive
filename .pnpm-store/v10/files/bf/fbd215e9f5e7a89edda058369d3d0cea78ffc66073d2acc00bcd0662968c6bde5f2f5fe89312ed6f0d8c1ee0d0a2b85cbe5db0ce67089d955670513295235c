import { QueryArrayConfig, QueryArrayResult, QueryConfig, QueryResult, ClientBase, ClientConfig } from 'pg';

type LogFn = (msg: string) => void;
type Logger = {
    debug?: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
};

interface DB {
    query(queryConfig: QueryArrayConfig, values?: any[]): Promise<QueryArrayResult>;
    query(queryConfig: QueryConfig): Promise<QueryResult>;
    query(queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<QueryResult>;
    select(queryConfig: QueryArrayConfig, values?: any[]): Promise<any[]>;
    select(queryConfig: QueryConfig): Promise<any[]>;
    select(queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<any[]>;
}
interface DBConnection extends DB {
    createConnection(): Promise<void>;
    column(columnName: string, queryConfig: QueryArrayConfig, values?: any[]): Promise<any[]>;
    column(columnName: string, queryConfig: QueryConfig): Promise<any[]>;
    column(columnName: string, queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<any[]>;
    connected: () => boolean;
    addBeforeCloseListener: (listener: any) => number;
    close(): Promise<void>;
}

declare function escapeValue(val: Value): string | number;

interface FunctionParamType {
    mode?: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
    name?: string;
    type: string;
    default?: Value;
}
type FunctionParam = string | FunctionParamType;
interface FunctionOptions {
    returns?: string;
    language: string;
    replace?: boolean;
    window?: boolean;
    behavior?: 'IMMUTABLE' | 'STABLE' | 'VOLATILE';
    security?: 'INVOKER' | 'DEFINER';
    onNull?: boolean;
    parallel?: 'UNSAFE' | 'RESTRICTED' | 'SAFE';
    set?: Array<{
        configurationParameter: string;
        value: LiteralUnion<'FROM CURRENT'>;
    }>;
}

type DropFunctionOptions = DropOptions;
type DropFunction = (functionName: Name, functionParams: FunctionParam[], dropOptions?: DropFunctionOptions) => string;

type CreateFunctionOptions = FunctionOptions & DropOptions;
type CreateFunctionFn = (functionName: Name, functionParams: FunctionParam[], functionOptions: CreateFunctionOptions & DropFunctionOptions, definition: Value) => string;
type CreateFunction = Reversible<CreateFunctionFn>;

type RenameFunctionFn = (oldFunctionName: Name, functionParams: FunctionParam[], newFunctionName: Name) => string;
type RenameFunction = Reversible<RenameFunctionFn>;

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

/**
 * Represents a string that should not be escaped when used in a query.
 *
 * This will be used in `pgm.func` to create unescaped strings.
 */
declare class PgLiteral {
    /**
     * Creates a new `PgLiteral` instance.
     *
     * @param str The string value.
     * @returns The new `PgLiteral` instance.
     */
    static create(str: string): PgLiteral;
    /**
     * Indicates that this object is a `PgLiteral`.
     */
    readonly literal = true;
    /**
     * Value of the literal.
     */
    readonly value: string;
    /**
     * Creates a new `PgLiteral` instance.
     *
     * @param value The string value.
     */
    constructor(value: string);
    /**
     * Returns the string value.
     *
     * @returns The string value.
     */
    toString(): string;
}
type PgLiteralValue = PublicPart<PgLiteral>;
/**
 * Checks if the given value is a `PgLiteral`.
 *
 * @param val The value to check.
 * @returns `true` if the value is a `PgLiteral`, or `false` otherwise.
 */
declare function isPgLiteral(val: unknown): val is PgLiteral;

/**
 * Type that provides auto-suggestions but also any string.
 *
 * @see https://github.com/microsoft/TypeScript/issues/29729#issuecomment-471566609
 */
type LiteralUnion<TSuggested extends TBase, TBase = string> = TSuggested | (TBase & {
    zz_IGNORE_ME?: never;
});
type PublicPart<T> = {
    [K in keyof T]: T[K];
};
type Nullable<T> = {
    [P in keyof T]: T[P] | null;
};
type Value = null | boolean | string | number | PgLiteral | PgLiteralValue | Value[];
type Type = string | {
    type: string;
};
type Name = string | {
    schema?: string;
    name: string;
};
interface IfNotExistsOption {
    ifNotExists?: boolean;
}
interface IfExistsOption {
    ifExists?: boolean;
}
interface CascadeOption {
    cascade?: boolean;
}
type DropOptions = IfExistsOption & CascadeOption;
/**
 * A function that returns a normal SQL statement or an array of SQL statements.
 *
 * The array is useful for operations that need to return multiple SQL statements like an additional `COMMENT`.
 */
type OperationFn = (...args: any[]) => string | string[];
/**
 * A function that returns a normal SQL statement or an array of SQL statements.
 *
 * The array is useful for operations that need to return multiple SQL statements like an additional `COMMENT`.
 *
 * The `reverse` property is a function that takes the same arguments and try to infer the reverse SQL statement with that.
 */
type Operation = OperationFn & {
    /**
     * Reverse the operation if provided.
     */
    reverse?: OperationFn;
};
/**
 * A function that returns a normal SQL statement or an array of SQL statements.
 *
 * The array is useful for operations that need to return multiple SQL statements like an additional `COMMENT`.
 *
 * The `reverse` property is a function that takes the same arguments and try to infer the reverse SQL statement with that.
 */
type Reversible<TFunction extends (...args: any[]) => string | string[]> = TFunction & {
    /**
     * Reverse the operation.
     *
     * Needs to be the same function definition, because it takes the same
     * arguments and try to infer the reverse SQL statement with that.
     */
    reverse: TFunction;
};

type DropColumnsOptions = DropOptions;
type DropColumns = (tableName: Name, columns: string | string[] | {
    [name: string]: unknown;
}, dropOptions?: DropColumnsOptions) => string;

interface SequenceOptions {
    type?: Type;
    increment?: number;
    minvalue?: number | null | false;
    maxvalue?: number | null | false;
    start?: number;
    cache?: number;
    cycle?: boolean;
    owner?: string | null | false;
}

interface AlterSequenceOptions extends SequenceOptions {
    restart?: number | true;
}
type AlterSequence = (sequenceName: Name, sequenceOptions: AlterSequenceOptions) => string;

type DropSequenceOptions = DropOptions;
type DropSequence = (sequenceName: Name, dropOptions?: DropSequenceOptions) => string;

interface CreateSequenceOptions extends SequenceOptions, IfNotExistsOption {
    temporary?: boolean;
}
type CreateSequenceFn = (sequenceName: Name, sequenceOptions?: CreateSequenceOptions & DropSequenceOptions) => string;
type CreateSequence = Reversible<CreateSequenceFn>;

type RenameSequenceFn = (oldSequenceName: Name, newSequenceName: Name) => string;
type RenameSequence = Reversible<RenameSequenceFn>;

type Action = 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';
interface ReferencesOptions {
    referencesConstraintName?: string;
    referencesConstraintComment?: string;
    references: Name;
    onDelete?: Action;
    onUpdate?: Action;
    match?: 'FULL' | 'SIMPLE';
}
type SequenceGeneratedOptions = {
    precedence: 'ALWAYS' | 'BY DEFAULT';
} & SequenceOptions;
interface ColumnDefinition extends Partial<ReferencesOptions> {
    type: string;
    collation?: string;
    unique?: boolean;
    primaryKey?: boolean;
    notNull?: boolean;
    default?: Value;
    check?: string;
    deferrable?: boolean;
    deferred?: boolean;
    comment?: string | null;
    sequenceGenerated?: SequenceGeneratedOptions;
    expressionGenerated?: string;
}
interface ColumnDefinitions {
    [name: string]: ColumnDefinition | string;
}
type Like = 'COMMENTS' | 'CONSTRAINTS' | 'DEFAULTS' | 'IDENTITY' | 'INDEXES' | 'STATISTICS' | 'STORAGE' | 'ALL';
interface LikeOptions {
    including?: Like | Like[];
    excluding?: Like | Like[];
}
interface ForeignKeyOptions extends ReferencesOptions {
    columns: Name | Name[];
}
interface ConstraintOptions {
    check?: string | string[];
    unique?: Name | Array<Name | Name[]>;
    primaryKey?: Name | Name[];
    foreignKeys?: ForeignKeyOptions | ForeignKeyOptions[];
    exclude?: string;
    deferrable?: boolean;
    deferred?: boolean;
    comment?: string;
}
type PartitionStrategy = 'RANGE' | 'LIST' | 'HASH';
interface PartitionColumnOptions {
    name: string;
    collate?: string;
    opclass?: string;
}
interface PartitionOptions {
    strategy: PartitionStrategy;
    columns: Array<string | PartitionColumnOptions> | string | PartitionColumnOptions;
}
interface TableOptions extends IfNotExistsOption {
    temporary?: boolean;
    inherits?: Name;
    like?: Name | {
        table: Name;
        options?: LikeOptions;
    };
    constraints?: ConstraintOptions;
    comment?: string | null;
    partition?: PartitionOptions;
    unlogged?: boolean;
}

type AddColumnsOptions = IfNotExistsOption;
type AddColumnsFn = (tableName: Name, newColumns: ColumnDefinitions, addOptions?: AddColumnsOptions & DropColumnsOptions) => string;
type AddColumns = Reversible<AddColumnsFn>;

type DropConstraintOptions = DropOptions;
type DropConstraint = (tableName: Name, constraintName: string, options?: DropConstraintOptions) => string;

type CreateConstraintFn = (tableName: Name, constraintName: string | null, constraintExpressionOrOptions: (ConstraintOptions & DropConstraintOptions) | string) => string;
type CreateConstraint = Reversible<CreateConstraintFn>;

interface AlterColumnOptions {
    type?: string;
    default?: Value;
    notNull?: boolean;
    allowNull?: boolean;
    collation?: string;
    using?: string;
    comment?: string | null;
    sequenceGenerated?: null | false | SequenceGeneratedOptions;
    expressionGenerated?: null | string;
}
type AlterColumn = (tableName: Name, columnName: string, options: AlterColumnOptions) => string;

interface AlterTableOptions {
    levelSecurity?: 'DISABLE' | 'ENABLE' | 'FORCE' | 'NO FORCE';
    unlogged?: boolean;
}
type AlterTable = (tableName: Name, tableOptions: AlterTableOptions) => string;

type DropTableOptions = DropOptions;
type DropTable = (tableName: Name, dropOptions?: DropTableOptions) => string;

type CreateTableFn = (tableName: Name, columns: ColumnDefinitions, options?: TableOptions & DropTableOptions) => string;
type CreateTable = Reversible<CreateTableFn>;

type RenameColumnFn = (tableName: Name, oldColumnName: string, newColumnName: string) => string;
type RenameColumn = Reversible<RenameColumnFn>;

type RenameConstraintFn = (tableName: Name, oldConstraintName: string, newConstraintName: string) => string;
type RenameConstraint = Reversible<RenameConstraintFn>;

type RenameTableFn = (tableName: Name, newtableName: Name) => string;
type RenameTable = Reversible<RenameTableFn>;

type DropCastOptions = IfExistsOption;
type DropCast = (fromType: string, toType: string, dropOptions?: DropCastOptions) => string;

interface CreateCastWithFunctionOptions {
    functionName: Name;
    argumentTypes?: string[];
    inout?: undefined;
}
interface CreateCastWithoutFunctionOptions {
    functionName?: undefined;
    argumentTypes?: undefined;
    inout?: undefined;
}
interface CreateCastWithInoutOptions {
    functionName?: undefined;
    argumentTypes?: undefined;
    inout: boolean;
}
type CreateCastOptions = (CreateCastWithFunctionOptions | CreateCastWithoutFunctionOptions | CreateCastWithInoutOptions) & {
    as?: 'ASSIGNMENT' | 'IMPLICIT';
};
type CreateCastFn = (fromType: string, toType: string, options: CreateCastOptions & DropCastOptions) => string;
type CreateCast = Reversible<CreateCastFn>;

interface DomainOptions {
    default?: Value;
    notNull?: boolean;
    check?: string;
    constraintName?: string;
}

interface AlterDomainOptions extends DomainOptions {
    allowNull?: boolean;
}
type AlterDomain = (domainName: Name, domainOptions: AlterDomainOptions) => string;

type DropDomainOptions = DropOptions;
type DropDomain = (domainName: Name, dropOptions?: DropDomainOptions) => string;

interface CreateDomainOptions extends DomainOptions {
    collation?: string;
}
type CreateDomainFn = (domainName: Name, type: Type, domainOptions?: CreateDomainOptions & DropDomainOptions) => string;
type CreateDomain = Reversible<CreateDomainFn>;

type RenameDomainFn = (oldDomainName: Name, newDomainName: Name) => string;
type RenameDomain = Reversible<RenameDomainFn>;

type Extension = 'adminpack' | 'amcheck' | 'auth_delay' | 'auto_explain' | 'bloom' | 'btree_gin' | 'btree_gist' | 'citext' | 'cube' | 'dblink' | 'dict_int' | 'dict_xsyn' | 'earthdistance' | 'file_fdw' | 'fuzzystrmatch' | 'hstore' | 'intagg' | 'intarray' | 'isn' | 'lo' | 'ltree' | 'pageinspect' | 'passwordcheck' | 'pg_buffercache' | 'pgcrypto' | 'pg_freespacemap' | 'pg_prewarm' | 'pgrowlocks' | 'pg_stat_statements' | 'pgstattuple' | 'pg_trgm' | 'pg_visibility' | 'postgres_fdw' | 'seg' | 'sepgsql' | 'spi' | 'sslinfo' | 'tablefunc' | 'tcn' | 'test_decoding' | 'tsm_system_rows' | 'tsm_system_time' | 'unaccent' | 'uuid-ossp' | 'xml2';
type StringExtension = LiteralUnion<Extension>;

type DropExtensionOptions = DropOptions;
type DropExtension = (extension: StringExtension | StringExtension[], dropOptions?: DropExtensionOptions) => string | string[];

interface CreateExtensionOptions extends IfNotExistsOption {
    schema?: string;
}
type CreateExtensionFn = (extension: StringExtension | StringExtension[], extensionOptions?: CreateExtensionOptions & DropExtensionOptions) => string | string[];
type CreateExtension = Reversible<CreateExtensionFn>;

interface WithAdminOption {
    readonly withAdminOption?: boolean;
}
interface OnlyAdminOption {
    readonly onlyAdminOption?: boolean;
}
interface OnlyGrantOption {
    readonly onlyGrantOption?: boolean;
}
interface WithGrantOption {
    readonly withGrantOption?: boolean;
}
type TablePrivilege = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE' | 'REFERENCES' | 'TRIGGER';
type SchemaPrivilege = 'CREATE' | 'USAGE';
interface CommonOnTablesOptions {
    privileges: TablePrivilege | TablePrivilege[] | 'ALL';
    roles: Name | Name[];
}
type CommonGrantOnTablesOptions = CommonOnTablesOptions & WithGrantOption;
interface SomeTablesOptions {
    tables: Name | Name[];
}
interface AllTablesOptions {
    tables: 'ALL';
    schema: string;
}
type RevokeOnObjectsOptions = OnlyGrantOption & CascadeOption;

type RevokeOnSchemasOptions = OnlyGrantOnSchemasOptions & RevokeOnObjectsOptions;
type RevokeOnSchemas = (revokeOptions: RevokeOnSchemasOptions) => string;

interface OnlyGrantOnSchemasOptions {
    privileges: SchemaPrivilege | SchemaPrivilege[] | 'ALL';
    schemas: string[] | string;
    roles: Name | Name[];
}
type GrantOnSchemasOptions = OnlyGrantOnSchemasOptions & WithGrantOption & RevokeOnObjectsOptions;
type GrantOnSchemasFn = (grantOptions: GrantOnSchemasOptions & RevokeOnSchemasOptions) => string;
type GrantOnSchemas = Reversible<GrantOnSchemasFn>;

type RevokeOnTablesOptions = CommonOnTablesOptions & (AllTablesOptions | SomeTablesOptions) & RevokeOnObjectsOptions;
type RevokeOnTables = (revokeOptions: RevokeOnTablesOptions) => string;

type GrantOnSomeTablesOptions = CommonGrantOnTablesOptions & SomeTablesOptions;
type GrantOnAllTablesOptions = CommonGrantOnTablesOptions & AllTablesOptions;
type GrantOnTablesOptions = (GrantOnSomeTablesOptions | GrantOnAllTablesOptions) & RevokeOnObjectsOptions;
type GrantOnTablesFn = (grantOptions: GrantOnTablesOptions & RevokeOnTablesOptions) => string;
type GrantOnTables = Reversible<GrantOnTablesFn>;

type RevokeRolesOptions = OnlyAdminOption & CascadeOption;
type RevokeRoles = (roles: Name | Name[], rolesFrom: Name | Name[], revokeOptions?: RevokeRolesOptions) => string;

type GrantRolesOptions = WithAdminOption;
type GrantRolesFn = (rolesFrom: Name | Name[], rolesTo: Name | Name[], grantOptions?: GrantRolesOptions & RevokeRolesOptions) => string;
type GrantRoles = Reversible<GrantRolesFn>;

interface IndexColumn {
    name: string;
    opclass?: Name;
    sort?: 'ASC' | 'DESC';
}

interface DropIndexOptions extends DropOptions {
    unique?: boolean;
    name?: string;
    concurrently?: boolean;
}
type DropIndex = (tableName: Name, columns: string | Array<string | IndexColumn>, dropOptions?: DropIndexOptions) => string;

interface CreateIndexOptions extends IfNotExistsOption {
    name?: string;
    unique?: boolean;
    where?: string;
    concurrently?: boolean;
    method?: 'btree' | 'hash' | 'gist' | 'spgist' | 'gin';
    include?: string | string[];
}
type CreateIndexFn = (tableName: Name, columns: string | Array<string | IndexColumn>, indexOptions?: CreateIndexOptions & DropIndexOptions) => string;
type CreateIndex = Reversible<CreateIndexFn>;

type StorageParameters = {
    [key: string]: boolean | number;
};

interface AlterMaterializedViewOptions {
    cluster?: null | false | string;
    extension?: string;
    storageParameters?: Nullable<StorageParameters>;
}
type AlterMaterializedView = (viewName: Name, materializedViewOptions: AlterMaterializedViewOptions) => string;

type DropMaterializedViewOptions = DropOptions;
type DropMaterializedView = (viewName: Name, dropOptions?: DropMaterializedViewOptions) => string;

interface CreateMaterializedViewOptions extends IfNotExistsOption {
    columns?: string | string[];
    tablespace?: string;
    storageParameters?: StorageParameters;
    data?: boolean;
}
type CreateMaterializedViewFn = (viewName: Name, materializedViewOptions: CreateMaterializedViewOptions & DropMaterializedViewOptions, definition: string) => string;
type CreateMaterializedView = Reversible<CreateMaterializedViewFn>;

interface RefreshMaterializedViewOptions {
    concurrently?: boolean;
    data?: boolean;
}
type RefreshMaterializedViewFn = (viewName: Name, materializedViewOptions?: RefreshMaterializedViewOptions) => string;
type RefreshMaterializedView = Reversible<RefreshMaterializedViewFn>;

type RenameMaterializedViewFn = (viewName: Name, newViewName: Name) => string;
type RenameMaterializedView = Reversible<RenameMaterializedViewFn>;

type RenameMaterializedViewColumnFn = (viewName: Name, columnName: string, newColumnName: string) => string;
type RenameMaterializedViewColumn = Reversible<RenameMaterializedViewColumnFn>;

interface OperatorListDefinition {
    type: 'function' | 'operator';
    number: number;
    name: Name;
    params?: FunctionParam[];
}

type AddToOperatorFamilyFn = (operatorFamilyName: Name, indexMethod: Name, operatorList: OperatorListDefinition[]) => string;
type AddToOperatorFamily = Reversible<AddToOperatorFamilyFn>;

interface DropOperatorOptions extends DropOptions {
    left?: Name;
    right?: Name;
}
type DropOperator = (operatorName: Name, dropOptions?: DropOperatorOptions) => string;

interface CreateOperatorOptions {
    procedure: Name;
    left?: Name;
    right?: Name;
    commutator?: Name;
    negator?: Name;
    restrict?: Name;
    join?: Name;
    hashes?: boolean;
    merges?: boolean;
}
type CreateOperatorFn = (operatorName: Name, operatorOptions: CreateOperatorOptions & DropOperatorOptions) => string;
type CreateOperator = Reversible<CreateOperatorFn>;

type DropOperatorClassOptions = DropOptions;
type DropOperatorClass = (operatorClassName: Name, indexMethod: Name, dropOptions?: DropOperatorClassOptions) => string;

interface CreateOperatorClassOptions {
    default?: boolean;
    family?: string;
}
type CreateOperatorClassFn = (operatorClassName: Name, type: Type, indexMethod: Name, operatorList: OperatorListDefinition[], operatorClassOptions: CreateOperatorClassOptions & DropOperatorClassOptions) => string;
type CreateOperatorClass = Reversible<CreateOperatorClassFn>;

type DropOperatorFamilyOptions = DropOptions;
type DropOperatorFamily = (operatorFamilyName: Name, newSchemaName: Name, dropOptions?: DropOperatorFamilyOptions) => string;

interface CreateOperatorFamilyOptions {
}
type CreateOperatorFamilyFn = (operatorFamilyName: Name, indexMethod: Name, operatorFamilyOptions?: CreateOperatorFamilyOptions & DropOperatorFamilyOptions) => string;
type CreateOperatorFamily = Reversible<CreateOperatorFamilyFn>;

type RemoveFromOperatorFamily = (operatorFamilyName: Name, indexMethod: Name, operatorList: OperatorListDefinition[]) => string;

type RenameOperatorClassFn = (oldOperatorClassName: Name, indexMethod: Name, newOperatorClassName: Name) => string;
type RenameOperatorClass = Reversible<RenameOperatorClassFn>;

type RenameOperatorFamilyFn = (oldOperatorFamilyName: Name, indexMethod: Name, newOperatorFamilyName: Name) => string;
type RenameOperatorFamily = Reversible<RenameOperatorFamilyFn>;

interface PolicyOptions {
    role?: string | string[];
    using?: string;
    check?: string;
}

type AlterPolicy = (tableName: Name, policyName: string, policyOptions: PolicyOptions) => string;

type DropPolicyOptions = IfExistsOption;
type DropPolicy = (tableName: Name, policyName: string, dropOptions?: DropPolicyOptions) => string;

interface CreatePolicyOptionsEn {
    command?: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}
type CreatePolicyOptions = CreatePolicyOptionsEn & PolicyOptions;
type CreatePolicyFn = (tableName: Name, policyName: string, policyOptions?: CreatePolicyOptions & DropPolicyOptions) => string;
type CreatePolicy = Reversible<CreatePolicyFn>;

type RenamePolicyFn = (tableName: Name, policyName: string, newPolicyName: string) => string;
type RenamePolicy = Reversible<RenamePolicyFn>;

interface RoleOptions {
    superuser?: boolean;
    createdb?: boolean;
    createrole?: boolean;
    inherit?: boolean;
    login?: boolean;
    replication?: boolean;
    bypassrls?: boolean;
    limit?: number;
    password?: Value;
    encrypted?: boolean;
    valid?: Value;
    inRole?: string | string[];
    role?: string | string[];
    admin?: string | string[];
}

type AlterRole = (roleName: Name, roleOptions: RoleOptions) => string;

type DropRoleOptions = IfExistsOption;
type DropRole = (roleName: Name, dropOptions?: DropRoleOptions) => string;

type CreateRoleOptions = RoleOptions;
type CreateRoleFn = (roleName: Name, roleOptions?: CreateRoleOptions & DropRoleOptions) => string;
type CreateRole = Reversible<CreateRoleFn>;

type RenameRoleFn = (oldRoleName: Name, newRoleName: Name) => string;
type RenameRole = Reversible<RenameRoleFn>;

type DropSchemaOptions = DropOptions;
type DropSchema = (schemaName: string, dropOptions?: DropSchemaOptions) => string;

interface CreateSchemaOptions extends IfNotExistsOption {
    authorization?: string;
}
type CreateSchemaFn = (schemaName: string, schemaOptions?: CreateSchemaOptions & DropSchemaOptions) => string;
type CreateSchema = Reversible<CreateSchemaFn>;

type RenameSchemaFn = (oldSchemaName: string, newSchemaName: string) => string;
type RenameSchema = Reversible<RenameSchemaFn>;

type Sql = (sqlStr: string, args?: {
    [key: string]: Name | Value;
}) => string;

type DropTriggerOptions = DropOptions;
type DropTrigger = (tableName: Name, triggerName: string, dropOptions?: DropTriggerOptions) => string;

interface TriggerOptions {
    when?: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
    operation: string | string[];
    constraint?: boolean;
    function?: Name;
    functionParams?: Value[];
    level?: 'STATEMENT' | 'ROW';
    condition?: string;
    deferrable?: boolean;
    deferred?: boolean;
}

type CreateTriggerFn1 = (tableName: Name, triggerName: string, triggerOptions: TriggerOptions & DropTriggerOptions) => string;
type CreateTriggerFn2 = (tableName: Name, triggerName: string, triggerOptions: TriggerOptions & FunctionOptions & DropTriggerOptions, definition: Value) => string;
type CreateTriggerFn = CreateTriggerFn1 | CreateTriggerFn2;
type CreateTrigger = Reversible<CreateTriggerFn>;

type RenameTriggerFn = (tableName: Name, oldTriggerName: string, newTriggerName: string) => string;
type RenameTrigger = Reversible<RenameTriggerFn>;

type DropTypeAttributeOptions = IfExistsOption;
type DropTypeAttribute = (typeName: Name, attributeName: string, dropOptions?: DropTypeAttributeOptions) => string;

type AddTypeAttributeFn = (typeName: Name, attributeName: string, attributeType: Type & DropTypeAttributeOptions) => string;
type AddTypeAttribute = Reversible<AddTypeAttributeFn>;

interface AddTypeValueOptions extends IfNotExistsOption {
    before?: string;
    after?: string;
}
type AddTypeValue = (typeName: Name, value: Value, typeValueOptions?: AddTypeValueOptions) => string;

type DropTypeOptions = DropOptions;
type DropType = (typeName: Name, dropOptions?: DropTypeOptions) => string;

type CreateTypeFn = (typeName: Name, values: (Value[] | {
    [name: string]: Type;
}) & DropTypeOptions) => string;
type CreateType = Reversible<CreateTypeFn>;

type RenameTypeFn = (typeName: Name, newTypeName: Name) => string;
type RenameType = Reversible<RenameTypeFn>;

type RenameTypeAttributeFn = (typeName: Name, attributeName: string, newAttributeName: string) => string;
type RenameTypeAttribute = Reversible<RenameTypeAttributeFn>;

type RenameTypeValueFn = (typeName: Name, value: string, newValue: string) => string;
type RenameTypeValue = Reversible<RenameTypeValueFn>;

type SetTypeAttribute = (typeName: Name, attributeName: string, attributeType: Type) => string;

type ViewOptions = {
    [key: string]: boolean | number | string;
};

interface AlterViewOptions {
    checkOption?: null | 'CASCADED' | 'LOCAL';
    options?: Nullable<ViewOptions>;
}
type AlterView = (viewName: Name, viewOptions: AlterViewOptions) => string;

interface AlterViewColumnOptions {
    default?: Value;
}
type AlterViewColumn = (viewName: Name, columnName: string, viewColumnOptions: AlterViewColumnOptions) => string;

type DropViewOptions = DropOptions;
type DropView = (viewName: Name, dropOptions?: DropViewOptions) => string;

interface CreateViewOptions {
    temporary?: boolean;
    replace?: boolean;
    recursive?: boolean;
    columns?: string | string[];
    checkOption?: 'CASCADED' | 'LOCAL';
    options?: ViewOptions;
}
type CreateViewFn = (viewName: Name, options: CreateViewOptions & DropViewOptions, definition: string) => string;
type CreateView = Reversible<CreateViewFn>;

type RenameViewFn = (viewName: Name, newViewName: Name) => string;
type RenameView = Reversible<RenameViewFn>;

declare class MigrationBuilder {
    /**
     * Install an extension.
     *
     * @alias addExtension
     *
     * @see https://www.postgresql.org/docs/current/sql-createextension.html
     */
    readonly createExtension: (...args: Parameters<CreateExtension>) => void;
    /**
     * Remove an extension.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropextension.html
     */
    readonly dropExtension: (...args: Parameters<DropExtension>) => void;
    /**
     * Install an extension.
     *
     * @alias createExtension
     *
     * @see https://www.postgresql.org/docs/current/sql-createextension.html
     */
    readonly addExtension: (...args: Parameters<CreateExtension>) => void;
    /**
     * Define a new table.
     *
     * @see https://www.postgresql.org/docs/current/sql-createtable.html
     */
    readonly createTable: (...args: Parameters<CreateTable>) => void;
    /**
     * Remove a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-droptable.html
     */
    readonly dropTable: (...args: Parameters<DropTable>) => void;
    /**
     * Rename a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly renameTable: (...args: Parameters<RenameTable>) => void;
    /**
     * Change the definition of a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly alterTable: (...args: Parameters<AlterTable>) => void;
    /**
     * Add columns to a table.
     *
     * @alias addColumn
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly addColumns: (...args: Parameters<AddColumns>) => void;
    /**
     * Remove columns from a table.
     *
     * @alias dropColumn
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly dropColumns: (...args: Parameters<DropColumns>) => void;
    /**
     * Rename a column.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly renameColumn: (...args: Parameters<RenameColumn>) => void;
    /**
     * Change the definition of a column.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly alterColumn: (...args: Parameters<AlterColumn>) => void;
    /**
     * Add a column to a table.
     *
     * @alias addColumns
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly addColumn: (...args: Parameters<AddColumns>) => void;
    /**
     * Remove a column from a table.
     *
     * @alias dropColumns
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly dropColumn: (...args: Parameters<DropColumns>) => void;
    /**
     * Add a constraint to a table.
     *
     * @alias createConstraint
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly addConstraint: (...args: Parameters<CreateConstraint>) => void;
    /**
     * Remove a constraint from a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly dropConstraint: (...args: Parameters<DropConstraint>) => void;
    /**
     * Rename a constraint.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly renameConstraint: (...args: Parameters<RenameConstraint>) => void;
    /**
     * Add a constraint to a table.
     *
     * @alias addConstraint
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly createConstraint: (...args: Parameters<CreateConstraint>) => void;
    /**
     * Define a new data type.
     *
     * @alias addType
     *
     * @see https://www.postgresql.org/docs/current/sql-createtype.html
     */
    readonly createType: (...args: Parameters<CreateType>) => void;
    /**
     * Remove a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-droptype.html
     */
    readonly dropType: (...args: Parameters<DropType>) => void;
    /**
     * Define a new data type.
     *
     * @alias createType
     *
     * @see https://www.postgresql.org/docs/current/sql-createtype.html
     */
    readonly addType: (...args: Parameters<CreateType>) => void;
    /**
     * Rename a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly renameType: (...args: Parameters<RenameType>) => void;
    /**
     * Rename a data type attribute.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly renameTypeAttribute: (...args: Parameters<RenameTypeAttribute>) => void;
    /**
     * Rename a data type value.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly renameTypeValue: (...args: Parameters<RenameTypeValue>) => void;
    /**
     * Add an attribute to a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly addTypeAttribute: (...args: Parameters<AddTypeAttribute>) => void;
    /**
     * Remove an attribute from a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly dropTypeAttribute: (...args: Parameters<DropTypeAttribute>) => void;
    /**
     * Set an attribute of a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly setTypeAttribute: (...args: Parameters<SetTypeAttribute>) => void;
    /**
     * Add a value to a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly addTypeValue: (...args: Parameters<AddTypeValue>) => void;
    /**
     * Define a new index.
     *
     * @alias addIndex
     *
     * @see https://www.postgresql.org/docs/current/sql-createindex.html
     */
    readonly createIndex: (...args: Parameters<CreateIndex>) => void;
    /**
     * Remove an index.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropindex.html
     */
    readonly dropIndex: (...args: Parameters<DropIndex>) => void;
    /**
     * Define a new index.
     *
     * @alias createIndex
     *
     * @see https://www.postgresql.org/docs/current/sql-createindex.html
     */
    readonly addIndex: (...args: Parameters<CreateIndex>) => void;
    /**
     * Define a new database role.
     *
     * @see https://www.postgresql.org/docs/current/sql-createrole.html
     */
    readonly createRole: (...args: Parameters<CreateRole>) => void;
    /**
     * Remove a database role.
     *
     * @see https://www.postgresql.org/docs/current/sql-droprole.html
     */
    readonly dropRole: (...args: Parameters<DropRole>) => void;
    /**
     * Change a database role.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterrole.html
     */
    readonly alterRole: (...args: Parameters<AlterRole>) => void;
    /**
     * Rename a database role.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterrole.html
     */
    readonly renameRole: (...args: Parameters<RenameRole>) => void;
    /**
     * Define a new function.
     *
     * @see https://www.postgresql.org/docs/current/sql-createfunction.html
     */
    readonly createFunction: (...args: Parameters<CreateFunction>) => void;
    /**
     * Remove a function.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropfunction.html
     */
    readonly dropFunction: (...args: Parameters<DropFunction>) => void;
    /**
     * Rename a function.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterfunction.html
     */
    readonly renameFunction: (...args: Parameters<RenameFunction>) => void;
    /**
     * Define a new trigger.
     *
     * @see https://www.postgresql.org/docs/current/sql-createtrigger.html
     */
    readonly createTrigger: (...args: Parameters<CreateTrigger>) => void;
    /**
     * Remove a trigger.
     *
     * @see https://www.postgresql.org/docs/current/sql-droptrigger.html
     */
    readonly dropTrigger: (...args: Parameters<DropTrigger>) => void;
    /**
     * Rename a trigger.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertrigger.html
     */
    readonly renameTrigger: (...args: Parameters<RenameTrigger>) => void;
    /**
     * Define a new schema.
     *
     * @see https://www.postgresql.org/docs/current/sql-createschema.html
     */
    readonly createSchema: (...args: Parameters<CreateSchema>) => void;
    /**
     * Remove a schema.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropschema.html
     */
    readonly dropSchema: (...args: Parameters<DropSchema>) => void;
    /**
     * Rename a schema.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterschema.html
     */
    readonly renameSchema: (...args: Parameters<RenameSchema>) => void;
    /**
     * Define a new domain.
     *
     * @see https://www.postgresql.org/docs/current/sql-createdomain.html
     */
    readonly createDomain: (...args: Parameters<CreateDomain>) => void;
    /**
     * Remove a domain.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropdomain.html
     */
    readonly dropDomain: (...args: Parameters<DropDomain>) => void;
    /**
     * Change the definition of a domain.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterdomain.html
     */
    readonly alterDomain: (...args: Parameters<AlterDomain>) => void;
    /**
     * Rename a domain.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterdomain.html
     */
    readonly renameDomain: (...args: Parameters<RenameDomain>) => void;
    /**
     * Define a new sequence generator.
     *
     * @see https://www.postgresql.org/docs/current/sql-createsequence.html
     */
    readonly createSequence: (...args: Parameters<CreateSequence>) => void;
    /**
     * Remove a sequence.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropsequence.html
     */
    readonly dropSequence: (...args: Parameters<DropSequence>) => void;
    /**
     * Change the definition of a sequence generator.
     *
     * @see https://www.postgresql.org/docs/current/sql-altersequence.html
     */
    readonly alterSequence: (...args: Parameters<AlterSequence>) => void;
    /**
     * Rename a sequence.
     *
     * @see https://www.postgresql.org/docs/current/sql-altersequence.html
     */
    readonly renameSequence: (...args: Parameters<RenameSequence>) => void;
    /**
     * Define a new operator.
     *
     * @see https://www.postgresql.org/docs/current/sql-createoperator.html
     */
    readonly createOperator: (...args: Parameters<CreateOperator>) => void;
    /**
     * Remove an operator.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropoperator.html
     */
    readonly dropOperator: (...args: Parameters<DropOperator>) => void;
    /**
     * Define a new operator class.
     *
     * @see https://www.postgresql.org/docs/current/sql-createopclass.html
     */
    readonly createOperatorClass: (...args: Parameters<CreateOperatorClass>) => void;
    /**
     * Remove an operator class.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropopclass.html
     */
    readonly dropOperatorClass: (...args: Parameters<DropOperatorClass>) => void;
    /**
     * Rename an operator class.
     *
     * @see https://www.postgresql.org/docs/current/sql-alteropclass.html
     */
    readonly renameOperatorClass: (...args: Parameters<RenameOperatorClass>) => void;
    /**
     * Define a new operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-createopfamily.html
     */
    readonly createOperatorFamily: (...args: Parameters<CreateOperatorFamily>) => void;
    /**
     * Remove an operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropopfamily.html
     */
    readonly dropOperatorFamily: (...args: Parameters<DropOperatorFamily>) => void;
    /**
     * Rename an operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-alteropfamily.html
     */
    readonly renameOperatorFamily: (...args: Parameters<RenameOperatorFamily>) => void;
    /**
     * Add an operator to an operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-alteropfamily.html
     */
    readonly addToOperatorFamily: (...args: Parameters<AddToOperatorFamily>) => void;
    /**
     * Remove an operator from an operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-alteropfamily.html
     */
    readonly removeFromOperatorFamily: (...args: Parameters<RemoveFromOperatorFamily>) => void;
    /**
     * Define a new row-level security policy for a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-createpolicy.html
     */
    readonly createPolicy: (...args: Parameters<CreatePolicy>) => void;
    /**
     * Remove a row-level security policy from a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-droppolicy.html
     */
    readonly dropPolicy: (...args: Parameters<DropPolicy>) => void;
    /**
     * Change the definition of a row-level security policy.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterpolicy.html
     */
    readonly alterPolicy: (...args: Parameters<AlterPolicy>) => void;
    /**
     * Rename a row-level security policy.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterpolicy.html
     */
    readonly renamePolicy: (...args: Parameters<RenamePolicy>) => void;
    /**
     * Define a new view.
     *
     * @see https://www.postgresql.org/docs/current/sql-createview.html
     */
    readonly createView: (...args: Parameters<CreateView>) => void;
    /**
     * Remove a view.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropview.html
     */
    readonly dropView: (...args: Parameters<DropView>) => void;
    /**
     * Change the definition of a view.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterview.html
     */
    readonly alterView: (...args: Parameters<AlterView>) => void;
    /**
     * Change the definition of a view column.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterview.html
     */
    readonly alterViewColumn: (...args: Parameters<AlterViewColumn>) => void;
    /**
     * Rename a view.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterview.html
     */
    readonly renameView: (...args: Parameters<RenameView>) => void;
    /**
     * Define a new materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-creatematerializedview.html
     */
    readonly createMaterializedView: (...args: Parameters<CreateMaterializedView>) => void;
    /**
     * Remove a materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropmaterializedview.html
     */
    readonly dropMaterializedView: (...args: Parameters<DropMaterializedView>) => void;
    /**
     * Change the definition of a materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-altermaterializedview.html
     */
    readonly alterMaterializedView: (...args: Parameters<AlterMaterializedView>) => void;
    /**
     * Rename a materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-altermaterializedview.html
     */
    readonly renameMaterializedView: (...args: Parameters<RenameMaterializedView>) => void;
    /**
     * Rename a materialized view column.
     *
     * @see https://www.postgresql.org/docs/current/sql-altermaterializedview.html
     */
    readonly renameMaterializedViewColumn: (...args: Parameters<RenameMaterializedViewColumn>) => void;
    /**
     * Replace the contents of a materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
     */
    readonly refreshMaterializedView: (...args: Parameters<RefreshMaterializedView>) => void;
    /**
     * Define access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-grant.html
     */
    readonly grantRoles: (...args: Parameters<GrantRoles>) => void;
    /**
     * Remove access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-revoke.html
     */
    readonly revokeRoles: (...args: Parameters<RevokeRoles>) => void;
    /**
     * Define access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-grant.html
     */
    readonly grantOnSchemas: (...args: Parameters<GrantOnSchemas>) => void;
    /**
     * Remove access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-revoke.html
     */
    readonly revokeOnSchemas: (...args: Parameters<RevokeOnSchemas>) => void;
    /**
     * Define access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-grant.html
     */
    readonly grantOnTables: (...args: Parameters<GrantOnTables>) => void;
    /**
     * Remove access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-revoke.html
     */
    readonly revokeOnTables: (...args: Parameters<RevokeOnTables>) => void;
    /**
     * Define a new cast.
     *
     * @see https://www.postgresql.org/docs/current/sql-createcast.html
     */
    readonly createCast: (...args: Parameters<CreateCast>) => void;
    /**
     * Remove a cast.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropcast.html
     */
    readonly dropCast: (...args: Parameters<DropCast>) => void;
    /**
     * Run raw SQL, with some optional _[very basic](http://mir.aculo.us/2011/03/09/little-helpers-a-tweet-sized-javascript-templating-engine/)_ mustache templating.
     *
     * This is a low-level operation, and you should use the higher-level operations whenever possible.
     *
     * @param sql SQL query to run.
     * @param args Optional `key/val` of arguments to replace.
     *
     * @see https://www.postgresql.org/docs/current/sql-commands.html
     */
    readonly sql: (...args: Parameters<Sql>) => void;
    /**
     * Inserts raw string, **which is not escaped**.
     *
     * @param sql String to **not escaped**.
     *
     * @example
     * { default: pgm.func('CURRENT_TIMESTAMP') }
     */
    readonly func: (sql: string) => PgLiteral;
    /**
     * The `db` client instance.
     *
     * Can be used to run queries directly.
     */
    readonly db: DB;
    private _steps;
    private _REVERSE_MODE;
    private _useTransaction;
    constructor(db: DB, typeShorthands: ColumnDefinitions | undefined, shouldDecamelize: boolean, logger: Logger);
    /**
     * Run the reverse of the migration. Useful for creating a new migration that
     * reverts a previous migration.
     */
    enableReverseMode(): this;
    /**
     * By default, all migrations are run in one transaction, but some DB
     * operations like add type value (`pgm.addTypeValue`) does not work if the
     * type is not created in the same transaction.
     * e.g. if it is created in previous migration. You need to run specific
     * migration outside a transaction (`pgm.noTransaction`).
     * Be aware that this means that you can have some migrations applied and some
     * not applied, if there is some error during migrating (leading to `ROLLBACK`).
     */
    noTransaction(): this;
    isUsingTransaction(): boolean;
    getSql(): string;
    getSqlSteps(): string[];
}

interface MigrationBuilderActions {
    up?: MigrationAction | false;
    down?: MigrationAction | false;
    shorthands?: ColumnDefinitions;
}

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

/**
 * @see https://www.postgresql.org/docs/current/datatype.html
 */
declare const PgType: Readonly<{
    /**
     * signed eight-byte integer
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
     */
    BIGINT: "bigint";
    /**
     * alias for bigint
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
     */
    INT8: "int8";
    /**
     * autoincrementing eight-byte integer
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
     */
    BIGSERIAL: "bigserial";
    /**
     * alias for bigserial
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
     */
    SERIAL8: "serial8";
    /**
     * fixed-length bit string
     *
     * @see https://www.postgresql.org/docs/current/datatype-bit.html#DATATYPE-BIT
     */
    BIT: "bit";
    /**
     * fixed-length bit string
     *
     * @see https://www.postgresql.org/docs/current/datatype-bit.html#DATATYPE-BIT
     */
    BIT_1: "bit";
    /**
     * variable-length bit string
     *
     * @see https://www.postgresql.org/docs/current/datatype-bit.html#DATATYPE-BIT
     */
    BIT_VARYING: "bit varying";
    /**
     * alias for bit varying
     *
     * @see https://www.postgresql.org/docs/current/datatype-bit.html#DATATYPE-BIT
     */
    VARBIT: "varbit";
    /**
     * logical Boolean (true/false)
     *
     * @see https://www.postgresql.org/docs/current/datatype-boolean.html#DATATYPE-BOOLEAN
     */
    BOOLEAN: "boolean";
    /**
     * alias for boolean
     *
     * @see https://www.postgresql.org/docs/current/datatype-boolean.html#DATATYPE-BOOLEAN
     */
    BOOL: "bool";
    /**
     * rectangular box on a plane
     *
     * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
     */
    BOX: "box";
    /**
     * binary data ("byte array")
     *
     * @see https://www.postgresql.org/docs/current/datatype-binary.html#DATATYPE-BINARY
     */
    BYTEA: "bytea";
    /**
     * fixed-length character string
     *
     * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
     */
    CHARACTER: "character";
    /**
     * alias for character
     *
     * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
     */
    CHAR: "char";
    /**
     * variable-length character string
     *
     * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
     */
    CHARACTER_VARYING: "character varying";
    /**
     * alias for character varying
     *
     * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
     */
    VARCHAR: "varchar";
    /**
     * IPv4 or IPv6 network address
     *
     * @see https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-NET-TYPES
     */
    CIDR: "cidr";
    /**
     * circle on a plane
     *
     * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
     */
    CIRCLE: "circle";
    /**
     * calendar date (year, month, day)
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    DATE: "date";
    /**
     * float8	double precision floating-point number (8 bytes)
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-FLOAT
     */
    DOUBLE_PRECISION: "double precision";
    /**
     * alias for double precision
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-FLOAT
     */
    FLOAT8: "float8";
    /**
     * IPv4 or IPv6 host address
     *
     * @see https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-NET-TYPES
     */
    INET: "inet";
    /**
     * signed four-byte integer
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
     */
    INTEGER: "integer";
    /**
     * alias for integer
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
     */
    INT: "int";
    /**
     * alias for integer
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
     */
    INT4: "int4";
    /**
     * time span
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    INTERVAL: "interval";
    /**
     * textual JSON data
     *
     * @see https://www.postgresql.org/docs/current/datatype-json.html#DATATYPE-JSON
     */
    JSON: "json";
    /**
     * binary JSON data, decomposed
     *
     * @see https://www.postgresql.org/docs/current/datatype-json.html#DATATYPE-JSON
     */
    JSONB: "jsonb";
    /**
     * infinite line on a plane
     *
     * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
     */
    LINE: "line";
    /**
     * line segment on a plane
     *
     * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
     */
    LSEG: "lseg";
    /**
     * MAC (Media Access Control) address
     *
     * @see https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-NET-TYPES
     */
    MACADDR: "macaddr";
    /**
     * MAC (Media Access Control) address (EUI-64 format)
     *
     * @see https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-NET-TYPES
     */
    MACADDR8: "macaddr8";
    /**
     * currency amount
     *
     * @see https://www.postgresql.org/docs/current/datatype-money.html#DATATYPE-MONEY
     */
    MONEY: "money";
    /**
     * exact numeric of selectable precision
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL
     */
    NUMERIC: "numeric";
    /**
     * alias for numeric
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL
     */
    DECIMAL: "decimal";
    /**
     * geometric path on a plane
     *
     * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
     */
    PATH: "path";
    /**
     * PostgreSQL Log Sequence Number
     *
     * @see https://www.postgresql.org/docs/current/datatype-pg-lsn.html#DATATYPE-PG-LSN
     */
    PG_LSN: "pg_lsn";
    /**
     * user-level transaction ID snapshot
     */
    PG_SNAPSHOT: "pg_snapshot";
    /**
     * geometric point on a plane
     *
     * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
     */
    POINT: "point";
    /**
     * closed geometric path on a plane
     *
     * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
     */
    POLYGON: "polygon";
    /**
     * single precision floating-point number (4 bytes)
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-FLOAT
     */
    REAL: "real";
    /**
     * alias for real
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-FLOAT
     */
    FLOAT4: "float4";
    /**
     * signed two-byte integer
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
     */
    SMALLINT: "smallint";
    /**
     * alias for smallint
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
     */
    INT2: "int2";
    /**
     * autoincrementing two-byte integer
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
     */
    SMALLSERIAL: "smallserial";
    /**
     * alias for smallserial
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
     */
    SERIAL2: "serial2";
    /**
     * autoincrementing four-byte integer
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
     */
    SERIAL: "serial";
    /**
     * alias for serial
     *
     * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
     */
    SERIAL4: "serial4";
    /**
     * variable-length character string
     *
     * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
     */
    TEXT: "text";
    /**
     * time of day (no time zone)
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    TIME: "time";
    /**
     * alias of time
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    TIME_WITHOUT_TIME_ZONE: "time without time zone";
    /**
     * time of day, including time zone
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    TIME_WITH_TIME_ZONE: "time with time zone";
    /**
     * alias of time with time zone
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    TIMETZ: "timetz";
    /**
     * date and time (no time zone)
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    TIMESTAMP: "timestamp";
    /**
     * alias of timestamp
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    TIMESTAMP_WITHOUT_TIME_ZONE: "timestamp without time zone";
    /**
     * date and time, including time zone
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    TIMESTAMP_WITH_TIME_ZONE: "timestamp with time zone";
    /**
     * alias of timestamp with time zone
     *
     * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
     */
    TIMESTAMPTZ: "timestamptz";
    /**
     * text search query
     *
     * @see https://www.postgresql.org/docs/current/datatype-textsearch.html#DATATYPE-TSQUERY
     */
    TSQUERY: "tsquery";
    /**
     * text search document
     *
     * @see https://www.postgresql.org/docs/current/datatype-textsearch.html#DATATYPE-TSVECTOR
     */
    TSVECTOR: "tsvector";
    /**
     * user-level transaction ID snapshot
     *
     * @deprecated see `PG_SNAPSHOT`
     */
    TXID_SNAPSHOT: "txid_snapshot";
    /**
     * universally unique identifier
     *
     * @see https://www.postgresql.org/docs/current/datatype-uuid.html#DATATYPE-UUID
     */
    UUID: "uuid";
    /**
     * XML data
     *
     * @see https://www.postgresql.org/docs/current/datatype-xml.html#DATATYPE-XML
     */
    XML: "xml";
}>;
type PgType = (typeof PgType)[keyof typeof PgType];

export { type Action, type AddColumns, type AddColumnsFn, type AddColumnsOptions, type AddToOperatorFamily, type AddToOperatorFamilyFn, type AddTypeAttribute, type AddTypeAttributeFn, type AddTypeValue, type AddTypeValueOptions, type AllTablesOptions, type AlterColumn, type AlterColumnOptions, type AlterDomain, type AlterDomainOptions, type AlterMaterializedView, type AlterMaterializedViewOptions, type AlterPolicy, type AlterRole, type AlterSequence, type AlterSequenceOptions, type AlterTable, type AlterTableOptions, type AlterView, type AlterViewColumn, type AlterViewColumnOptions, type AlterViewOptions, type CascadeOption, type ColumnDefinition, type ColumnDefinitions, type CommonGrantOnTablesOptions, type CommonOnTablesOptions, type ConstraintOptions, type CreateCast, type CreateCastFn, type CreateCastOptions, type CreateCastWithFunctionOptions, type CreateCastWithInoutOptions, type CreateCastWithoutFunctionOptions, type CreateConstraint, type CreateConstraintFn, type CreateDomain, type CreateDomainFn, type CreateDomainOptions, type CreateExtension, type CreateExtensionFn, type CreateExtensionOptions, type CreateFunction, type CreateFunctionFn, type CreateFunctionOptions, type CreateIndex, type CreateIndexFn, type CreateIndexOptions, type CreateMaterializedView, type CreateMaterializedViewFn, type CreateMaterializedViewOptions, type CreateOperator, type CreateOperatorClass, type CreateOperatorClassFn, type CreateOperatorClassOptions, type CreateOperatorFamily, type CreateOperatorFamilyFn, type CreateOperatorFamilyOptions, type CreateOperatorFn, type CreateOperatorOptions, type CreatePolicy, type CreatePolicyOptions, type CreatePolicyOptionsEn, type CreateRole, type CreateRoleFn, type CreateRoleOptions, type CreateSchema, type CreateSchemaFn, type CreateSchemaOptions, type CreateSequence, type CreateSequenceFn, type CreateSequenceOptions, type CreateTable, type CreateTableFn, type CreateTrigger, type CreateTriggerFn, type CreateTriggerFn1, type CreateTriggerFn2, type CreateType, type CreateTypeFn, type CreateView, type CreateViewFn, type CreateViewOptions, type DomainOptions, type DropCast, type DropCastOptions, type DropColumns, type DropColumnsOptions, type DropConstraint, type DropConstraintOptions, type DropDomain, type DropDomainOptions, type DropExtension, type DropExtensionOptions, type DropFunction, type DropFunctionOptions, type DropIndex, type DropIndexOptions, type DropMaterializedView, type DropMaterializedViewOptions, type DropOperator, type DropOperatorClass, type DropOperatorClassOptions, type DropOperatorFamily, type DropOperatorFamilyOptions, type DropOperatorOptions, type DropOptions, type DropPolicy, type DropPolicyOptions, type DropRole, type DropRoleOptions, type DropSchema, type DropSchemaOptions, type DropSequence, type DropSequenceOptions, type DropTable, type DropTableOptions, type DropTrigger, type DropTriggerOptions, type DropType, type DropTypeAttribute, type DropTypeAttributeOptions, type DropTypeOptions, type DropView, type DropViewOptions, type Extension, type ForeignKeyOptions, type FunctionOptions, type FunctionParam, type FunctionParamType, type GrantOnAllTablesOptions, type GrantOnSchemas, type GrantOnSchemasFn, type GrantOnSchemasOptions, type GrantOnSomeTablesOptions, type GrantOnTables, type GrantOnTablesFn, type GrantOnTablesOptions, type GrantRoles, type GrantRolesFn, type GrantRolesOptions, type IfExistsOption, type IfNotExistsOption, type IndexColumn, type Like, type LikeOptions, type LiteralUnion, Migration, MigrationBuilder, type Name, type Nullable, type OnlyAdminOption, type OnlyGrantOnSchemasOptions, type OnlyGrantOption, type Operation, type OperationFn, type OperatorListDefinition, PG_MIGRATE_LOCK_ID, PgLiteral, type PgLiteralValue, PgType, type PolicyOptions, type PublicPart, type ReferencesOptions, type RefreshMaterializedView, type RefreshMaterializedViewFn, type RefreshMaterializedViewOptions, type RemoveFromOperatorFamily, type RenameColumn, type RenameColumnFn, type RenameConstraint, type RenameConstraintFn, type RenameDomain, type RenameDomainFn, type RenameFunction, type RenameFunctionFn, type RenameMaterializedView, type RenameMaterializedViewColumn, type RenameMaterializedViewColumnFn, type RenameMaterializedViewFn, type RenameOperatorClass, type RenameOperatorClassFn, type RenameOperatorFamily, type RenameOperatorFamilyFn, type RenamePolicy, type RenamePolicyFn, type RenameRole, type RenameRoleFn, type RenameSchema, type RenameSchemaFn, type RenameSequence, type RenameSequenceFn, type RenameTable, type RenameTableFn, type RenameTrigger, type RenameTriggerFn, type RenameType, type RenameTypeAttribute, type RenameTypeAttributeFn, type RenameTypeFn, type RenameTypeValue, type RenameTypeValueFn, type RenameView, type RenameViewFn, type Reversible, type RevokeOnObjectsOptions, type RevokeOnSchemas, type RevokeOnSchemasOptions, type RevokeOnTables, type RevokeOnTablesOptions, type RevokeRoles, type RevokeRolesOptions, type RoleOptions, type RunnerOption, type SchemaPrivilege, type SequenceGeneratedOptions, type SequenceOptions, type SetTypeAttribute, type SomeTablesOptions, type Sql, type StorageParameters, type StringExtension, type TableOptions, type TablePrivilege, type TriggerOptions, type Type, type Value, type ViewOptions, type WithAdminOption, type WithGrantOption, escapeValue, isPgLiteral, runner };
