function dropTypeAttribute(mOptions) {
  const _drop = (typeName, attributeName, options = {}) => {
    const { ifExists = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const typeNameStr = mOptions.literal(typeName);
    const attributeNameStr = mOptions.literal(attributeName);
    return `ALTER TYPE ${typeNameStr} DROP ATTRIBUTE ${attributeNameStr}${ifExistsStr};`;
  };
  return _drop;
}
export {
  dropTypeAttribute
};
