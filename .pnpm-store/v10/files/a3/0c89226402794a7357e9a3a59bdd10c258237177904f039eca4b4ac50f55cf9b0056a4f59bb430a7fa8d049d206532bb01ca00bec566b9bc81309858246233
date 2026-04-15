import { dropRole } from "./dropRole.js";
import { formatRoleOptions } from "./shared.js";
function createRole(mOptions) {
  const _create = (roleName, roleOptions = {}) => {
    const options = formatRoleOptions({
      ...roleOptions,
      superuser: roleOptions.superuser || false,
      createdb: roleOptions.createdb || false,
      createrole: roleOptions.createrole || false,
      inherit: roleOptions.inherit !== false,
      login: roleOptions.login || false,
      replication: roleOptions.replication || false
    });
    const optionsStr = options ? ` WITH ${options}` : "";
    return `CREATE ROLE ${mOptions.literal(roleName)}${optionsStr};`;
  };
  _create.reverse = dropRole(mOptions);
  return _create;
}
export {
  createRole
};
