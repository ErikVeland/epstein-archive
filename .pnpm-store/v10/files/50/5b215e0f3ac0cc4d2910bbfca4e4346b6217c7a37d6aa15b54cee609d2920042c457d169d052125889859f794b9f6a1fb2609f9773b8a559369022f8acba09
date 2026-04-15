import { toArray } from "../../utils.js";
import { asRolesStr, asTablesStr } from "./shared.js";
function revokeOnTables(mOptions) {
  const _revokeOnTables = (options) => {
    const {
      privileges,
      roles,
      onlyGrantOption = false,
      cascade = false
    } = options;
    const rolesStr = asRolesStr(roles, mOptions);
    const privilegesStr = toArray(privileges).map(String).join(", ");
    const tablesStr = asTablesStr(options, mOptions);
    const onlyGrantOptionStr = onlyGrantOption ? " GRANT OPTION FOR" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `REVOKE${onlyGrantOptionStr} ${privilegesStr} ON ${tablesStr} FROM ${rolesStr}${cascadeStr};`;
  };
  return _revokeOnTables;
}
export {
  revokeOnTables
};
