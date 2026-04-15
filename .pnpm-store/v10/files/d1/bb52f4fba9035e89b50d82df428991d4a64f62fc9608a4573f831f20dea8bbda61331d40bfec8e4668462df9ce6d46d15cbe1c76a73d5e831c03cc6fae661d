import { a as ColumnDefinitions, T as TableOptions, M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from '../../generalTypes-BlKhVJMl.js';
import { DropTableOptions } from './dropTable.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type CreateTableFn = (tableName: Name, columns: ColumnDefinitions, options?: TableOptions & DropTableOptions) => string;
type CreateTable = Reversible<CreateTableFn>;
declare function createTable(mOptions: MigrationOptions): CreateTable;

export { type CreateTable, type CreateTableFn, createTable };
