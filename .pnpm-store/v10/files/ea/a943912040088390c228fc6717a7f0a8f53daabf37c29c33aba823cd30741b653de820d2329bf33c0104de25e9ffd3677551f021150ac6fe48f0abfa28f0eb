function dropOperatorClass(mOptions) {
  const _drop = (operatorClassName, indexMethod, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const operatorClassNameStr = mOptions.literal(operatorClassName);
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `DROP OPERATOR CLASS${ifExistsStr} ${operatorClassNameStr} USING ${indexMethod}${cascadeStr};`;
  };
  return _drop;
}
export {
  dropOperatorClass
};
