import { formatRoleOptions } from "./shared.js";
function alterRole(mOptions) {
  const _alter = (roleName, roleOptions = {}) => {
    const options = formatRoleOptions(roleOptions);
    return options ? `ALTER ROLE ${mOptions.literal(roleName)} WITH ${options};` : "";
  };
  return _alter;
}
export {
  alterRole
};
