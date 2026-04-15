function renameMaterializedViewColumn(mOptions) {
  const _rename = (viewName, columnName, newColumnName) => {
    const viewNameStr = mOptions.literal(viewName);
    const columnNameStr = mOptions.literal(columnName);
    const newColumnNameStr = mOptions.literal(newColumnName);
    return `ALTER MATERIALIZED VIEW ${viewNameStr} RENAME COLUMN ${columnNameStr} TO ${newColumnNameStr};`;
  };
  _rename.reverse = (viewName, columnName, newColumnName) => _rename(viewName, newColumnName, columnName);
  return _rename;
}
export {
  renameMaterializedViewColumn
};
