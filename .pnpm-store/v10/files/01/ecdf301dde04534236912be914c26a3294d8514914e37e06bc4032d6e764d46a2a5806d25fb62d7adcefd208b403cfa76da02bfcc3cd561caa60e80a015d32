import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from '../../generalTypes-BlKhVJMl.js';
import { DropViewOptions } from './dropView.js';
import { ViewOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface CreateViewOptions {
    temporary?: boolean;
    replace?: boolean;
    recursive?: boolean;
    columns?: string | string[];
    checkOption?: 'CASCADED' | 'LOCAL';
    options?: ViewOptions;
}
type CreateViewFn = (viewName: Name, options: CreateViewOptions & DropViewOptions, definition: string) => string;
type CreateView = Reversible<CreateViewFn>;
declare function createView(mOptions: MigrationOptions): CreateView;

export { type CreateView, type CreateViewFn, type CreateViewOptions, createView };
