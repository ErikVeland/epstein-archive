import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, a as IfNotExistsOption } from '../../generalTypes-BlKhVJMl.js';
import { DropSchemaOptions } from './dropSchema.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface CreateSchemaOptions extends IfNotExistsOption {
    authorization?: string;
}
type CreateSchemaFn = (schemaName: string, schemaOptions?: CreateSchemaOptions & DropSchemaOptions) => string;
type CreateSchema = Reversible<CreateSchemaFn>;
declare function createSchema(mOptions: MigrationOptions): CreateSchema;

export { type CreateSchema, type CreateSchemaFn, type CreateSchemaOptions, createSchema };
