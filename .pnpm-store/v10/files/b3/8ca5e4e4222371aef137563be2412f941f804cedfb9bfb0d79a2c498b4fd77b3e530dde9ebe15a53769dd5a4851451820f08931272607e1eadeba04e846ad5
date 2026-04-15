function renameColumn(mOptions) {
  const _rename = (tableName, columnName, newName) => {
    const tableNameStr = mOptions.literal(tableName);
    const columnNameStr = mOptions.literal(columnName);
    const newNameStr = mOptions.literal(newName);
    return `ALTER TABLE ${tableNameStr} RENAME ${columnNameStr} TO ${newNameStr};`;
  };
  _rename.reverse = (tableName, columnName, newName) => _rename(tableName, newName, columnName);
  return _rename;
}
export {
  renameColumn
};
