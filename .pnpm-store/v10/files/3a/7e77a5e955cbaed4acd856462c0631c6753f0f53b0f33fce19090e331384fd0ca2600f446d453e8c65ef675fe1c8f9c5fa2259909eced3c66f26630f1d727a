import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, a as IfNotExistsOption } from '../../generalTypes-BlKhVJMl.js';
import { DropExtensionOptions } from './dropExtension.js';
import { StringExtension } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface CreateExtensionOptions extends IfNotExistsOption {
    schema?: string;
}
type CreateExtensionFn = (extension: StringExtension | StringExtension[], extensionOptions?: CreateExtensionOptions & DropExtensionOptions) => string | string[];
type CreateExtension = Reversible<CreateExtensionFn>;
declare function createExtension(mOptions: MigrationOptions): CreateExtension;

export { type CreateExtension, type CreateExtensionFn, type CreateExtensionOptions, createExtension };
