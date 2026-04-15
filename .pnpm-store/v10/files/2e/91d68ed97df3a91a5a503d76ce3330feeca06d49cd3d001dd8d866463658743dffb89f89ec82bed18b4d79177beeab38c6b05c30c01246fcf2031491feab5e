function renameType(mOptions) {
  const _rename = (typeName, newTypeName) => {
    const typeNameStr = mOptions.literal(typeName);
    const newTypeNameStr = mOptions.literal(newTypeName);
    return `ALTER TYPE ${typeNameStr} RENAME TO ${newTypeNameStr};`;
  };
  _rename.reverse = (typeName, newTypeName) => _rename(newTypeName, typeName);
  return _rename;
}
export {
  renameType
};
