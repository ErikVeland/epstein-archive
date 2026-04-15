import { M as MigrationOptions } from './migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from './generalTypes-BlKhVJMl.js';
import { RevokeOnObjectsOptions, SchemaPrivilege, WithGrantOption } from './operations/grants/shared.js';

type RevokeOnSchemasOptions = OnlyGrantOnSchemasOptions & RevokeOnObjectsOptions;
type RevokeOnSchemas = (revokeOptions: RevokeOnSchemasOptions) => string;
declare function revokeOnSchemas(mOptions: MigrationOptions): RevokeOnSchemas;

interface OnlyGrantOnSchemasOptions {
    privileges: SchemaPrivilege | SchemaPrivilege[] | 'ALL';
    schemas: string[] | string;
    roles: Name | Name[];
}
type GrantOnSchemasOptions = OnlyGrantOnSchemasOptions & WithGrantOption & RevokeOnObjectsOptions;
type GrantOnSchemasFn = (grantOptions: GrantOnSchemasOptions & RevokeOnSchemasOptions) => string;
type GrantOnSchemas = Reversible<GrantOnSchemasFn>;
declare function grantOnSchemas(mOptions: MigrationOptions): GrantOnSchemas;

export { type GrantOnSchemas as G, type OnlyGrantOnSchemasOptions as O, type RevokeOnSchemas as R, type GrantOnSchemasFn as a, type GrantOnSchemasOptions as b, type RevokeOnSchemasOptions as c, grantOnSchemas as g, revokeOnSchemas as r };
