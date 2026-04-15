import { toArray } from "../../utils.js";
function revokeRoles(mOptions) {
  const _revokeRoles = (roles, rolesFrom, options = {}) => {
    const { onlyAdminOption = false, cascade = false } = options;
    const rolesStr = toArray(roles).map(mOptions.literal).join(", ");
    const rolesToStr = toArray(rolesFrom).map(mOptions.literal).join(", ");
    const onlyAdminOptionStr = onlyAdminOption ? " ADMIN OPTION FOR" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `REVOKE${onlyAdminOptionStr} ${rolesStr} FROM ${rolesToStr}${cascadeStr};`;
  };
  return _revokeRoles;
}
export {
  revokeRoles
};
