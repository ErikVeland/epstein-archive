import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from '../../generalTypes-BlKhVJMl.js';
import { DropCastOptions } from './dropCast.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface CreateCastWithFunctionOptions {
    functionName: Name;
    argumentTypes?: string[];
    inout?: undefined;
}
interface CreateCastWithoutFunctionOptions {
    functionName?: undefined;
    argumentTypes?: undefined;
    inout?: undefined;
}
interface CreateCastWithInoutOptions {
    functionName?: undefined;
    argumentTypes?: undefined;
    inout: boolean;
}
type CreateCastOptions = (CreateCastWithFunctionOptions | CreateCastWithoutFunctionOptions | CreateCastWithInoutOptions) & {
    as?: 'ASSIGNMENT' | 'IMPLICIT';
};
type CreateCastFn = (fromType: string, toType: string, options: CreateCastOptions & DropCastOptions) => string;
type CreateCast = Reversible<CreateCastFn>;
declare function createCast(mOptions: MigrationOptions): CreateCast;

export { type CreateCast, type CreateCastFn, type CreateCastOptions, type CreateCastWithFunctionOptions, type CreateCastWithInoutOptions, type CreateCastWithoutFunctionOptions, createCast };
