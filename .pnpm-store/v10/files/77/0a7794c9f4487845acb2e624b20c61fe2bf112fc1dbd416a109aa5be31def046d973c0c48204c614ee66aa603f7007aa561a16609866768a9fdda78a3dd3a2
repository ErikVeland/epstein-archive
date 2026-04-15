import { escapeValue } from "../../utils.js";
function addTypeValue(mOptions) {
  const _add = (typeName, value, options = {}) => {
    const { before, after, ifNotExists = false } = options;
    if (before && after) {
      throw new Error(`"before" and "after" can't be specified together`);
    }
    const beforeStr = before ? ` BEFORE ${escapeValue(before)}` : "";
    const afterStr = after ? ` AFTER ${escapeValue(after)}` : "";
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const valueStr = escapeValue(value);
    const typeNameStr = mOptions.literal(typeName);
    return `ALTER TYPE ${typeNameStr} ADD VALUE${ifNotExistsStr} ${valueStr}${beforeStr}${afterStr};`;
  };
  return _add;
}
export {
  addTypeValue
};
