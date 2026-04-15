import { a as ColumnDefinitions, M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name, a as IfNotExistsOption } from '../../generalTypes-BlKhVJMl.js';
import { DropColumnsOptions } from './dropColumns.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type AddColumnsOptions = IfNotExistsOption;
type AddColumnsFn = (tableName: Name, newColumns: ColumnDefinitions, addOptions?: AddColumnsOptions & DropColumnsOptions) => string;
type AddColumns = Reversible<AddColumnsFn>;
declare function addColumns(mOptions: MigrationOptions): AddColumns;

export { type AddColumns, type AddColumnsFn, type AddColumnsOptions, addColumns };
