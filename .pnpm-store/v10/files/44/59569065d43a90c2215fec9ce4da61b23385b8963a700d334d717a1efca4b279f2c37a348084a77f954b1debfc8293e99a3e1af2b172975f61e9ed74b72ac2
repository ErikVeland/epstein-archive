function renameTable(mOptions) {
  const _rename = (tableName, newName) => {
    const tableNameStr = mOptions.literal(tableName);
    const newNameStr = mOptions.literal(newName);
    return `ALTER TABLE ${tableNameStr} RENAME TO ${newNameStr};`;
  };
  _rename.reverse = (tableName, newName) => _rename(newName, tableName);
  return _rename;
}
export {
  renameTable
};
