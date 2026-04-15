import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name, D as DropOptions, V as Value } from '../../generalTypes-BlKhVJMl.js';
import { DropFunctionOptions } from './dropFunction.js';
import { FunctionParam, FunctionOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type CreateFunctionOptions = FunctionOptions & DropOptions;
type CreateFunctionFn = (functionName: Name, functionParams: FunctionParam[], functionOptions: CreateFunctionOptions & DropFunctionOptions, definition: Value) => string;
type CreateFunction = Reversible<CreateFunctionFn>;
declare function createFunction(mOptions: MigrationOptions): CreateFunction;

export { type CreateFunction, type CreateFunctionFn, type CreateFunctionOptions, createFunction };
