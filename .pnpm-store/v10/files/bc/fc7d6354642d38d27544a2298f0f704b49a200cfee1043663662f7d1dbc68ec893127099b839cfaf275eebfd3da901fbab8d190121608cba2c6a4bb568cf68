import { applyType } from "../../utils.js";
function setTypeAttribute(mOptions) {
  return (typeName, attributeName, attributeType) => {
    const typeStr = applyType(attributeType, mOptions.typeShorthands).type;
    const typeNameStr = mOptions.literal(typeName);
    const attributeNameStr = mOptions.literal(attributeName);
    return `ALTER TYPE ${typeNameStr} ALTER ATTRIBUTE ${attributeNameStr} SET DATA TYPE ${typeStr};`;
  };
}
export {
  setTypeAttribute
};
