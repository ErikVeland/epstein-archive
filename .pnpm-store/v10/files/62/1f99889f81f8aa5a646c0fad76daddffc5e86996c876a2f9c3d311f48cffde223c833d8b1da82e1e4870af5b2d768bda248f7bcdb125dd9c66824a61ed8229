function renameOperatorFamily(mOptions) {
  const _rename = (oldOperatorFamilyName, indexMethod, newOperatorFamilyName) => {
    const oldOperatorFamilyNameStr = mOptions.literal(oldOperatorFamilyName);
    const newOperatorFamilyNameStr = mOptions.literal(newOperatorFamilyName);
    return `ALTER OPERATOR FAMILY ${oldOperatorFamilyNameStr} USING ${indexMethod} RENAME TO ${newOperatorFamilyNameStr};`;
  };
  _rename.reverse = (oldOperatorFamilyName, indexMethod, newOperatorFamilyName) => _rename(newOperatorFamilyName, indexMethod, oldOperatorFamilyName);
  return _rename;
}
export {
  renameOperatorFamily
};
