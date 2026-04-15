import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { N as Name } from '../../generalTypes-BlKhVJMl.js';
import { FunctionParam } from '../functions/shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface OperatorListDefinition {
    type: 'function' | 'operator';
    number: number;
    name: Name;
    params?: FunctionParam[];
}
declare function operatorMap(mOptions: MigrationOptions): ({ type, number, name, params }: OperatorListDefinition) => string;

export { type OperatorListDefinition, operatorMap };
