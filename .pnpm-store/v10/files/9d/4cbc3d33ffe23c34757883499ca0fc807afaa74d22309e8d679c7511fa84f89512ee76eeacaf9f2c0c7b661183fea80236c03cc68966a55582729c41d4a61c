import { d as SequenceGeneratedOptions, M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { N as Name, V as Value } from '../../generalTypes-BlKhVJMl.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

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
declare function alterColumn(mOptions: MigrationOptions): AlterColumn;

export { type AlterColumn, type AlterColumnOptions, alterColumn };
