import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { CommonOnTablesOptions, AllTablesOptions, SomeTablesOptions, RevokeOnObjectsOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';
import '../../generalTypes-BlKhVJMl.js';

type RevokeOnTablesOptions = CommonOnTablesOptions & (AllTablesOptions | SomeTablesOptions) & RevokeOnObjectsOptions;
type RevokeOnTables = (revokeOptions: RevokeOnTablesOptions) => string;
declare function revokeOnTables(mOptions: MigrationOptions): RevokeOnTables;

export { type RevokeOnTables, type RevokeOnTablesOptions, revokeOnTables };
