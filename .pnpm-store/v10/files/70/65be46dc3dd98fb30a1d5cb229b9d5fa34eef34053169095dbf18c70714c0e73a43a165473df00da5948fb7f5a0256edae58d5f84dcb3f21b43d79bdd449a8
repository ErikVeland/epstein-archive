import { toArray } from "../../utils.js";
import { revokeOnTables } from "./revokeOnTables.js";
import { asRolesStr, asTablesStr } from "./shared.js";
function grantOnTables(mOptions) {
  const _grantOnTables = (options) => {
    const { privileges, roles, withGrantOption = false } = options;
    const rolesStr = asRolesStr(roles, mOptions);
    const privilegesStr = toArray(privileges).map(String).join(", ");
    const tablesStr = asTablesStr(options, mOptions);
    const withGrantOptionStr = withGrantOption ? " WITH GRANT OPTION" : "";
    return `GRANT ${privilegesStr} ON ${tablesStr} TO ${rolesStr}${withGrantOptionStr};`;
  };
  _grantOnTables.reverse = revokeOnTables(mOptions);
  return _grantOnTables;
}
export {
  grantOnTables
};
