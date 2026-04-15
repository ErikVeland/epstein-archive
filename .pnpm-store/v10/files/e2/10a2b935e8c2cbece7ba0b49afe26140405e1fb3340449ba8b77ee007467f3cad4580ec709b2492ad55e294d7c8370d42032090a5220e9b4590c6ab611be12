import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { N as Name, D as DropOptions, R as Reversible, a as IfNotExistsOption } from '../../generalTypes-BlKhVJMl.js';
import { Literal } from '../../utils/createTransformer.js';
import '../../logger.js';

interface IndexColumn {
    name: string;
    opclass?: Name;
    sort?: 'ASC' | 'DESC';
}
declare function generateIndexName(table: Name, columns: Array<string | IndexColumn>, options: CreateIndexOptions | DropIndexOptions, schemalize: Literal): Name;
declare function generateColumnString(column: Name, mOptions: MigrationOptions): string;
declare function generateColumnsString(columns: Array<string | IndexColumn>, mOptions: MigrationOptions): string;

interface DropIndexOptions extends DropOptions {
    unique?: boolean;
    name?: string;
    concurrently?: boolean;
}
type DropIndex = (tableName: Name, columns: string | Array<string | IndexColumn>, dropOptions?: DropIndexOptions) => string;
declare function dropIndex(mOptions: MigrationOptions): DropIndex;

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
declare function createIndex(mOptions: MigrationOptions): CreateIndex;

export { type CreateIndex, type CreateIndexFn, type CreateIndexOptions, type DropIndex, type DropIndexOptions, type IndexColumn, createIndex, dropIndex, generateColumnString, generateColumnsString, generateIndexName };
