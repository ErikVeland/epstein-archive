import { dropPolicy } from "./dropPolicy.js";
import { makeClauses } from "./shared.js";
function createPolicy(mOptions) {
  const _create = (tableName, policyName, options = {}) => {
    const { role = "PUBLIC", command = "ALL" } = options;
    const createOptions = {
      ...options,
      role
    };
    const clauses = [`FOR ${command}`, ...makeClauses(createOptions)];
    const clausesStr = clauses.join(" ");
    const policyNameStr = mOptions.literal(policyName);
    const tableNameStr = mOptions.literal(tableName);
    return `CREATE POLICY ${policyNameStr} ON ${tableNameStr} ${clausesStr};`;
  };
  _create.reverse = dropPolicy(mOptions);
  return _create;
}
export {
  createPolicy
};
