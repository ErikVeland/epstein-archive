import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name, a as IfNotExistsOption } from '../../generalTypes-BlKhVJMl.js';
import { DropMaterializedViewOptions } from './dropMaterializedView.js';
import { StorageParameters } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface CreateMaterializedViewOptions extends IfNotExistsOption {
    columns?: string | string[];
    tablespace?: string;
    storageParameters?: StorageParameters;
    data?: boolean;
}
type CreateMaterializedViewFn = (viewName: Name, materializedViewOptions: CreateMaterializedViewOptions & DropMaterializedViewOptions, definition: string) => string;
type CreateMaterializedView = Reversible<CreateMaterializedViewFn>;
declare function createMaterializedView(mOptions: MigrationOptions): CreateMaterializedView;

export { type CreateMaterializedView, type CreateMaterializedViewFn, type CreateMaterializedViewOptions, createMaterializedView };
