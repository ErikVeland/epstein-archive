import { applyType } from "../../utils.js";
import { dropTypeAttribute } from "./dropTypeAttribute.js";
function addTypeAttribute(mOptions) {
  const _alterAttributeAdd = (typeName, attributeName, attributeType) => {
    const typeStr = applyType(attributeType, mOptions.typeShorthands).type;
    const typeNameStr = mOptions.literal(typeName);
    const attributeNameStr = mOptions.literal(attributeName);
    return `ALTER TYPE ${typeNameStr} ADD ATTRIBUTE ${attributeNameStr} ${typeStr};`;
  };
  _alterAttributeAdd.reverse = dropTypeAttribute(mOptions);
  return _alterAttributeAdd;
}
export {
  addTypeAttribute
};
