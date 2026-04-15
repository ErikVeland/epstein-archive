import { escapeValue } from "../../utils.js";
function renameTypeValue(mOptions) {
  const _rename = (typeName, value, newValue) => {
    const valueStr = escapeValue(value);
    const newValueStr = escapeValue(newValue);
    const typeNameStr = mOptions.literal(typeName);
    return `ALTER TYPE ${typeNameStr} RENAME VALUE ${valueStr} TO ${newValueStr};`;
  };
  _rename.reverse = (typeName, value, newValue) => _rename(typeName, newValue, value);
  return _rename;
}
export {
  renameTypeValue
};
