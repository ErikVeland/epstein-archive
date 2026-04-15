function renameOperatorClass(mOptions) {
  const _rename = (oldOperatorClassName, indexMethod, newOperatorClassName) => {
    const oldOperatorClassNameStr = mOptions.literal(oldOperatorClassName);
    const newOperatorClassNameStr = mOptions.literal(newOperatorClassName);
    return `ALTER OPERATOR CLASS ${oldOperatorClassNameStr} USING ${indexMethod} RENAME TO ${newOperatorClassNameStr};`;
  };
  _rename.reverse = (oldOperatorClassName, indexMethod, newOperatorClassName) => _rename(newOperatorClassName, indexMethod, oldOperatorClassName);
  return _rename;
}
export {
  renameOperatorClass
};
