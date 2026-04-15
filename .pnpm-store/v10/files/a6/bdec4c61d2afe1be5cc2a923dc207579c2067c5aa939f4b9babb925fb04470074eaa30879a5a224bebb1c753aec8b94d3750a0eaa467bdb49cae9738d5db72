import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name, V as Value } from '../../generalTypes-BlKhVJMl.js';
import { FunctionOptions } from '../functions/shared.js';
import { DropTriggerOptions } from './dropTrigger.js';
import { TriggerOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type CreateTriggerFn1 = (tableName: Name, triggerName: string, triggerOptions: TriggerOptions & DropTriggerOptions) => string;
type CreateTriggerFn2 = (tableName: Name, triggerName: string, triggerOptions: TriggerOptions & FunctionOptions & DropTriggerOptions, definition: Value) => string;
type CreateTriggerFn = CreateTriggerFn1 | CreateTriggerFn2;
type CreateTrigger = Reversible<CreateTriggerFn>;
declare function createTrigger(mOptions: MigrationOptions): CreateTrigger;

export { type CreateTrigger, type CreateTriggerFn, type CreateTriggerFn1, type CreateTriggerFn2, createTrigger };
