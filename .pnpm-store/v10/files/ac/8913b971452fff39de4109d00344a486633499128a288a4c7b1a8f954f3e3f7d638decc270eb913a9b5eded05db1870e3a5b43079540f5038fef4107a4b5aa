function dropView(mOptions) {
  const _drop = (viewName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const viewNameStr = mOptions.literal(viewName);
    return `DROP VIEW${ifExistsStr} ${viewNameStr}${cascadeStr};`;
  };
  return _drop;
}
export {
  dropView
};
