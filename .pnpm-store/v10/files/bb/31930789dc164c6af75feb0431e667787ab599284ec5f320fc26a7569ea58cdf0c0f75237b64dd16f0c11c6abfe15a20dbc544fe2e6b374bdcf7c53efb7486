import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from '../../generalTypes-BlKhVJMl.js';
import { RevokeRolesOptions } from './revokeRoles.js';
import { WithAdminOption } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type GrantRolesOptions = WithAdminOption;
type GrantRolesFn = (rolesFrom: Name | Name[], rolesTo: Name | Name[], grantOptions?: GrantRolesOptions & RevokeRolesOptions) => string;
type GrantRoles = Reversible<GrantRolesFn>;
declare function grantRoles(mOptions: MigrationOptions): GrantRoles;

export { type GrantRoles, type GrantRolesFn, type GrantRolesOptions, grantRoles };
