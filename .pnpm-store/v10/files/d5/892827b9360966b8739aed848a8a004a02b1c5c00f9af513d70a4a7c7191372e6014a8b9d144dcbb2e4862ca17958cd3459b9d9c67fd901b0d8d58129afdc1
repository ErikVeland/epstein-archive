import { makeClauses } from "./shared.js";
function alterPolicy(mOptions) {
  const _alter = (tableName, policyName, options = {}) => {
    const clausesStr = makeClauses(options).join(" ");
    const policyNameStr = mOptions.literal(policyName);
    const tableNameStr = mOptions.literal(tableName);
    return `ALTER POLICY ${policyNameStr} ON ${tableNameStr} ${clausesStr};`;
  };
  return _alter;
}
export {
  alterPolicy
};
