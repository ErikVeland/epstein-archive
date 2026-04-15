import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { N as Name, b as Nullable } from '../../generalTypes-BlKhVJMl.js';
import { StorageParameters } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface AlterMaterializedViewOptions {
    cluster?: null | false | string;
    extension?: string;
    storageParameters?: Nullable<StorageParameters>;
}
type AlterMaterializedView = (viewName: Name, materializedViewOptions: AlterMaterializedViewOptions) => string;
declare function alterMaterializedView(mOptions: MigrationOptions): AlterMaterializedView;

export { type AlterMaterializedView, type AlterMaterializedViewOptions, alterMaterializedView };
