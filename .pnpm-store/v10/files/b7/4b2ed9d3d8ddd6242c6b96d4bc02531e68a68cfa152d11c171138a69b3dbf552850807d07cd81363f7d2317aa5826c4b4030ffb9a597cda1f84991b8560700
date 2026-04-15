import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name, T as Type } from '../../generalTypes-BlKhVJMl.js';
import { DropOperatorClassOptions } from './dropOperatorClass.js';
import { OperatorListDefinition } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';
import '../functions/shared.js';

interface CreateOperatorClassOptions {
    default?: boolean;
    family?: string;
}
type CreateOperatorClassFn = (operatorClassName: Name, type: Type, indexMethod: Name, operatorList: OperatorListDefinition[], operatorClassOptions: CreateOperatorClassOptions & DropOperatorClassOptions) => string;
type CreateOperatorClass = Reversible<CreateOperatorClassFn>;
declare function createOperatorClass(mOptions: MigrationOptions): CreateOperatorClass;

export { type CreateOperatorClass, type CreateOperatorClassFn, type CreateOperatorClassOptions, createOperatorClass };
