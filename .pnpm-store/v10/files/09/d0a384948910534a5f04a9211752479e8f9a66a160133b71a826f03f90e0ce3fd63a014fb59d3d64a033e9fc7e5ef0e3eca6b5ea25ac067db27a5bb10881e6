function renamePolicy(mOptions) {
  const _rename = (tableName, policyName, newPolicyName) => {
    const policyNameStr = mOptions.literal(policyName);
    const newPolicyNameStr = mOptions.literal(newPolicyName);
    const tableNameStr = mOptions.literal(tableName);
    return `ALTER POLICY ${policyNameStr} ON ${tableNameStr} RENAME TO ${newPolicyNameStr};`;
  };
  _rename.reverse = (tableName, policyName, newPolicyName) => _rename(tableName, newPolicyName, policyName);
  return _rename;
}
export {
  renamePolicy
};
