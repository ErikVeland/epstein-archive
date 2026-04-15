function dropSchema(mOptions) {
  const _drop = (schemaName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const schemaNameStr = mOptions.literal(schemaName);
    return `DROP SCHEMA${ifExistsStr} ${schemaNameStr}${cascadeStr};`;
  };
  return _drop;
}
export {
  dropSchema
};
