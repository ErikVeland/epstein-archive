function dropOperator(mOptions) {
  const _drop = (operatorName, options = {}) => {
    const {
      left = "none",
      right = "none",
      ifExists = false,
      cascade = false
    } = options;
    const operatorNameStr = mOptions.schemalize(operatorName);
    const leftStr = mOptions.literal(left);
    const rightStr = mOptions.literal(right);
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `DROP OPERATOR${ifExistsStr} ${operatorNameStr}(${leftStr}, ${rightStr})${cascadeStr};`;
  };
  return _drop;
}
export {
  dropOperator
};
