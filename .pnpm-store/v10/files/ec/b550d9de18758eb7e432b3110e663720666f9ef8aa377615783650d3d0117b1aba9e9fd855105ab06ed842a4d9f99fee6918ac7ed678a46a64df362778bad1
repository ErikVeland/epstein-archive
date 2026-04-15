import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { N as Name } from '../../generalTypes-BlKhVJMl.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface AlterTableOptions {
    levelSecurity?: 'DISABLE' | 'ENABLE' | 'FORCE' | 'NO FORCE';
    unlogged?: boolean;
}
type AlterTable = (tableName: Name, tableOptions: AlterTableOptions) => string;
declare function alterTable(mOptions: MigrationOptions): AlterTable;

export { type AlterTable, type AlterTableOptions, alterTable };
