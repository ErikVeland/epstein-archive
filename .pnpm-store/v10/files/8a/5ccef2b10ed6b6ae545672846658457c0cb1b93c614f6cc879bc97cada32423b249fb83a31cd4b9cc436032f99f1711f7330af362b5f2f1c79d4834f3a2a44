import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { D as DropOptions, N as Name } from '../../generalTypes-BlKhVJMl.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface DropOperatorOptions extends DropOptions {
    left?: Name;
    right?: Name;
}
type DropOperator = (operatorName: Name, dropOptions?: DropOperatorOptions) => string;
declare function dropOperator(mOptions: MigrationOptions): DropOperator;

export { type DropOperator, type DropOperatorOptions, dropOperator };
