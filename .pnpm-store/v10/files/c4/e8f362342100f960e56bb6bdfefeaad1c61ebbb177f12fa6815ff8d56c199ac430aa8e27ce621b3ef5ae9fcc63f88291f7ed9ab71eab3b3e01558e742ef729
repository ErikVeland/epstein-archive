import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { C as CascadeOption, N as Name } from '../../generalTypes-BlKhVJMl.js';
import { OnlyAdminOption } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type RevokeRolesOptions = OnlyAdminOption & CascadeOption;
type RevokeRoles = (roles: Name | Name[], rolesFrom: Name | Name[], revokeOptions?: RevokeRolesOptions) => string;
declare function revokeRoles(mOptions: MigrationOptions): RevokeRoles;

export { type RevokeRoles, type RevokeRolesOptions, revokeRoles };
