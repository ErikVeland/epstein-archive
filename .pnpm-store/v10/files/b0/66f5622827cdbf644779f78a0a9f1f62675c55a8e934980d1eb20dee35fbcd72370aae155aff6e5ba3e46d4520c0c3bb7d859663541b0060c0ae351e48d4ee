import { toArray } from "../../utils.js";
import { revokeOnSchemas } from "./revokeOnSchemas.js";
import { asRolesStr } from "./shared.js";
function grantOnSchemas(mOptions) {
  const _grantOnSchemas = (options) => {
    const { privileges, schemas, roles, withGrantOption = false } = options;
    const rolesStr = asRolesStr(roles, mOptions);
    const schemasStr = toArray(schemas).map(mOptions.literal).join(", ");
    const privilegesStr = toArray(privileges).map(String).join(", ");
    const withGrantOptionStr = withGrantOption ? " WITH GRANT OPTION" : "";
    return `GRANT ${privilegesStr} ON SCHEMA ${schemasStr} TO ${rolesStr}${withGrantOptionStr};`;
  };
  _grantOnSchemas.reverse = revokeOnSchemas(mOptions);
  return _grantOnSchemas;
}
export {
  grantOnSchemas
};
