import { toArray } from "../../utils.js";
function isAllTablesOptions(options) {
  return "schema" in options;
}
function asRolesStr(roles, mOptions) {
  return toArray(roles).map((role) => role === "PUBLIC" ? role : mOptions.literal(role)).join(", ");
}
function asTablesStr(options, mOptions) {
  return isAllTablesOptions(options) ? `ALL TABLES IN SCHEMA ${mOptions.literal(options.schema)}` : toArray(options.tables).map(mOptions.literal).join(", ");
}
export {
  asRolesStr,
  asTablesStr,
  isAllTablesOptions
};
