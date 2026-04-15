function renameConstraint(mOptions) {
  const _rename = (tableName, constraintName, newName) => {
    const tableNameStr = mOptions.literal(tableName);
    const constraintNameStr = mOptions.literal(constraintName);
    const newNameStr = mOptions.literal(newName);
    return `ALTER TABLE ${tableNameStr} RENAME CONSTRAINT ${constraintNameStr} TO ${newNameStr};`;
  };
  _rename.reverse = (tableName, constraintName, newName) => _rename(tableName, newName, constraintName);
  return _rename;
}
export {
  renameConstraint
};
