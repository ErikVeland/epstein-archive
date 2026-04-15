import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { N as Name, b as Nullable } from '../../generalTypes-BlKhVJMl.js';
import { ViewOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface AlterViewOptions {
    checkOption?: null | 'CASCADED' | 'LOCAL';
    options?: Nullable<ViewOptions>;
}
type AlterView = (viewName: Name, viewOptions: AlterViewOptions) => string;
declare function alterView(mOptions: MigrationOptions): AlterView;

export { type AlterView, type AlterViewOptions, alterView };
