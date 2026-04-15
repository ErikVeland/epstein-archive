import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from '../../generalTypes-BlKhVJMl.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface RefreshMaterializedViewOptions {
    concurrently?: boolean;
    data?: boolean;
}
type RefreshMaterializedViewFn = (viewName: Name, materializedViewOptions?: RefreshMaterializedViewOptions) => string;
type RefreshMaterializedView = Reversible<RefreshMaterializedViewFn>;
declare function refreshMaterializedView(mOptions: MigrationOptions): RefreshMaterializedView;

export { type RefreshMaterializedView, type RefreshMaterializedViewFn, type RefreshMaterializedViewOptions, refreshMaterializedView };
