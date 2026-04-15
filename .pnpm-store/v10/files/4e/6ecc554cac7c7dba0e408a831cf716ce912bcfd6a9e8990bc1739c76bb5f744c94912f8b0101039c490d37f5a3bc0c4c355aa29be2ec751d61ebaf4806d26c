import { toArray } from "../../utils.js";
import { revokeRoles } from "./revokeRoles.js";
function grantRoles(mOptions) {
  const _grantRoles = (rolesFrom, rolesTo, options = {}) => {
    const { withAdminOption = false } = options;
    const rolesFromStr = toArray(rolesFrom).map(mOptions.literal).join(", ");
    const rolesToStr = toArray(rolesTo).map(mOptions.literal).join(", ");
    const withAdminOptionStr = withAdminOption ? " WITH ADMIN OPTION" : "";
    return `GRANT ${rolesFromStr} TO ${rolesToStr}${withAdminOptionStr};`;
  };
  _grantRoles.reverse = revokeRoles(mOptions);
  return _grantRoles;
}
export {
  grantRoles
};
