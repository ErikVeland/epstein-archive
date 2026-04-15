import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible } from '../../generalTypes-BlKhVJMl.js';
import { RevokeOnTablesOptions } from './revokeOnTables.js';
import { CommonGrantOnTablesOptions, SomeTablesOptions, AllTablesOptions, RevokeOnObjectsOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type GrantOnSomeTablesOptions = CommonGrantOnTablesOptions & SomeTablesOptions;
type GrantOnAllTablesOptions = CommonGrantOnTablesOptions & AllTablesOptions;
type GrantOnTablesOptions = (GrantOnSomeTablesOptions | GrantOnAllTablesOptions) & RevokeOnObjectsOptions;
type GrantOnTablesFn = (grantOptions: GrantOnTablesOptions & RevokeOnTablesOptions) => string;
type GrantOnTables = Reversible<GrantOnTablesFn>;
declare function grantOnTables(mOptions: MigrationOptions): GrantOnTables;

export { type GrantOnAllTablesOptions, type GrantOnSomeTablesOptions, type GrantOnTables, type GrantOnTablesFn, type GrantOnTablesOptions, grantOnTables };
