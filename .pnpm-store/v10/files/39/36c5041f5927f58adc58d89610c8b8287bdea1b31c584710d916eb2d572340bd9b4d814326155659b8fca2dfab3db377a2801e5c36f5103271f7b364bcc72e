import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from '../../generalTypes-BlKhVJMl.js';
import { DropRoleOptions } from './dropRole.js';
import { RoleOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type CreateRoleOptions = RoleOptions;
type CreateRoleFn = (roleName: Name, roleOptions?: CreateRoleOptions & DropRoleOptions) => string;
type CreateRole = Reversible<CreateRoleFn>;
declare function createRole(mOptions: MigrationOptions): CreateRole;

export { type CreateRole, type CreateRoleFn, type CreateRoleOptions, createRole };
