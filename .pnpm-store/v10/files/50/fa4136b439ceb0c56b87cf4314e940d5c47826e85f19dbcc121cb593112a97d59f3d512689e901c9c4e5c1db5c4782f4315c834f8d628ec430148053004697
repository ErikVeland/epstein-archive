import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name, V as Value, T as Type } from '../../generalTypes-BlKhVJMl.js';
import { DropTypeOptions } from './dropType.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type CreateTypeFn = (typeName: Name, values: (Value[] | {
    [name: string]: Type;
}) & DropTypeOptions) => string;
type CreateType = Reversible<CreateTypeFn>;
declare function createType(mOptions: MigrationOptions): CreateType;

export { type CreateType, type CreateTypeFn, createType };
