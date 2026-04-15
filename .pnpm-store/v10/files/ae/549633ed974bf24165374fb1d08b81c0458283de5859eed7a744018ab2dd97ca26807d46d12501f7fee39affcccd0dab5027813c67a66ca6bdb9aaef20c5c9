function dropTable(mOptions) {
  const _drop = (tableName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const tableNameStr = mOptions.literal(tableName);
    return `DROP TABLE${ifExistsStr} ${tableNameStr}${cascadeStr};`;
  };
  return _drop;
}
export {
  dropTable
};
