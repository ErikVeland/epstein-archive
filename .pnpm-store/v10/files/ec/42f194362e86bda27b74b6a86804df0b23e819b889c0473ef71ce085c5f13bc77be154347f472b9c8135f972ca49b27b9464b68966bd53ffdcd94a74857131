function dropOperatorFamily(mOptions) {
  const _drop = (operatorFamilyName, indexMethod, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const operatorFamilyNameStr = mOptions.literal(operatorFamilyName);
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `DROP OPERATOR FAMILY${ifExistsStr} ${operatorFamilyNameStr} USING ${indexMethod}${cascadeStr};`;
  };
  return _drop;
}
export {
  dropOperatorFamily
};
