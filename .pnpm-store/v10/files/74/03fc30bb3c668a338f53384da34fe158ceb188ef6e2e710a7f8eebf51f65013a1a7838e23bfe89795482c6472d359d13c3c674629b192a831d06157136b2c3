import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { C as CascadeOption, N as Name } from '../../generalTypes-BlKhVJMl.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface WithAdminOption {
    readonly withAdminOption?: boolean;
}
interface OnlyAdminOption {
    readonly onlyAdminOption?: boolean;
}
interface OnlyGrantOption {
    readonly onlyGrantOption?: boolean;
}
interface WithGrantOption {
    readonly withGrantOption?: boolean;
}
type TablePrivilege = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE' | 'REFERENCES' | 'TRIGGER';
type SchemaPrivilege = 'CREATE' | 'USAGE';
interface CommonOnTablesOptions {
    privileges: TablePrivilege | TablePrivilege[] | 'ALL';
    roles: Name | Name[];
}
type CommonGrantOnTablesOptions = CommonOnTablesOptions & WithGrantOption;
interface SomeTablesOptions {
    tables: Name | Name[];
}
interface AllTablesOptions {
    tables: 'ALL';
    schema: string;
}
type RevokeOnObjectsOptions = OnlyGrantOption & CascadeOption;
declare function isAllTablesOptions(options: AllTablesOptions | SomeTablesOptions): options is AllTablesOptions;
declare function asRolesStr(roles: Name | Name[], mOptions: MigrationOptions): string;
declare function asTablesStr(options: AllTablesOptions | SomeTablesOptions, mOptions: MigrationOptions): string;

export { type AllTablesOptions, type CommonGrantOnTablesOptions, type CommonOnTablesOptions, type OnlyAdminOption, type OnlyGrantOption, type RevokeOnObjectsOptions, type SchemaPrivilege, type SomeTablesOptions, type TablePrivilege, type WithAdminOption, type WithGrantOption, asRolesStr, asTablesStr, isAllTablesOptions };
