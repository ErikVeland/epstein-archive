import { Logger } from './logger.js';
import { Literal } from './utils/createTransformer.js';
import { T as Type, N as Name, V as Value, a as IfNotExistsOption } from './generalTypes-BlKhVJMl.js';

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
declare function parseSequenceOptions(typeShorthands: ColumnDefinitions | undefined, options: SequenceOptions): string[];

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
declare function parseReferences(options: ReferencesOptions, literal: Literal): string;
declare function parseDeferrable(options: {
    deferred?: boolean;
}): string;
declare function parseColumns(tableName: Name, columns: ColumnDefinitions, mOptions: MigrationOptions): {
    columns: string[];
    constraints: ConstraintOptions;
    comments: string[];
};
declare function parseConstraints(table: Name, options: ConstraintOptions, optionName: string | null, literal: Literal): {
    constraints: string[];
    comments: string[];
};
declare function parseLike(like: Name | {
    table: Name;
    options?: LikeOptions;
}, literal: Literal): string;

interface MigrationOptions {
    typeShorthands?: ColumnDefinitions;
    schemalize: Literal;
    literal: Literal;
    logger: Logger;
}

export { type Action as A, type ColumnDefinition as C, type ForeignKeyOptions as F, type Like as L, type MigrationOptions as M, type PartitionStrategy as P, type ReferencesOptions as R, type SequenceOptions as S, type TableOptions as T, type ColumnDefinitions as a, type ConstraintOptions as b, type LikeOptions as c, type SequenceGeneratedOptions as d, type PartitionColumnOptions as e, type PartitionOptions as f, parseReferences as g, parseDeferrable as h, parseColumns as i, parseConstraints as j, parseLike as k, parseSequenceOptions as p };
