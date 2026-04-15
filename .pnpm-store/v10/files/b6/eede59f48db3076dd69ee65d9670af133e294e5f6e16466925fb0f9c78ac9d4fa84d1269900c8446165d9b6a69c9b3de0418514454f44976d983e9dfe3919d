import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from '../../generalTypes-BlKhVJMl.js';
import { DropOperatorOptions } from './dropOperator.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

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
declare function createOperator(mOptions: MigrationOptions): CreateOperator;

export { type CreateOperator, type CreateOperatorFn, type CreateOperatorOptions, createOperator };
