function dropSequence(mOptions) {
  const _drop = (sequenceName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const sequenceNameStr = mOptions.literal(sequenceName);
    return `DROP SEQUENCE${ifExistsStr} ${sequenceNameStr}${cascadeStr};`;
  };
  return _drop;
}
export {
  dropSequence
};
