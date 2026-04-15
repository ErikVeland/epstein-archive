function renameTypeAttribute(mOptions) {
  const _rename = (typeName, attributeName, newAttributeName) => {
    const typeNameStr = mOptions.literal(typeName);
    const attributeNameStr = mOptions.literal(attributeName);
    const newAttributeNameStr = mOptions.literal(newAttributeName);
    return `ALTER TYPE ${typeNameStr} RENAME ATTRIBUTE ${attributeNameStr} TO ${newAttributeNameStr};`;
  };
  _rename.reverse = (typeName, attributeName, newAttributeName) => _rename(typeName, newAttributeName, attributeName);
  return _rename;
}
export {
  renameTypeAttribute
};
