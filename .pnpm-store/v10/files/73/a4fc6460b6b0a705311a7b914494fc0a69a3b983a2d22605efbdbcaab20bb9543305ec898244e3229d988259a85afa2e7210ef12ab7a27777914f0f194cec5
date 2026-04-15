import { toArray } from "../../utils.js";
import { asRolesStr } from "./shared.js";
function revokeOnSchemas(mOptions) {
  const _revokeOnSchemas = (options) => {
    const {
      privileges,
      schemas,
      roles,
      onlyGrantOption = false,
      cascade = false
    } = options;
    const rolesStr = asRolesStr(roles, mOptions);
    const schemasStr = toArray(schemas).map(mOptions.literal).join(", ");
    const privilegesStr = toArray(privileges).map(String).join(", ");
    const onlyGrantOptionStr = onlyGrantOption ? " GRANT OPTION FOR" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `REVOKE${onlyGrantOptionStr} ${privilegesStr} ON SCHEMA ${schemasStr} FROM ${rolesStr}${cascadeStr};`;
  };
  return _revokeOnSchemas;
}
export {
  revokeOnSchemas
};
