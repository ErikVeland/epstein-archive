function dropMaterializedView(mOptions) {
  const _drop = (viewName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const viewNameStr = mOptions.literal(viewName);
    return `DROP MATERIALIZED VIEW${ifExistsStr} ${viewNameStr}${cascadeStr};`;
  };
  return _drop;
}
export {
  dropMaterializedView
};
