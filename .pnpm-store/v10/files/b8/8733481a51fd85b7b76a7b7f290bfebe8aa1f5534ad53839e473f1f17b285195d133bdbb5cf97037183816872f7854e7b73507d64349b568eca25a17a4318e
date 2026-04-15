function dropCast(mOptions) {
  const _drop = (sourceType, targetType, options = {}) => {
    const { ifExists = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    return `DROP CAST${ifExistsStr} (${sourceType} AS ${targetType});`;
  };
  return _drop;
}
export {
  dropCast
};
