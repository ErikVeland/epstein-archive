import { applyType, escapeValue } from "../../utils.js";
import { dropType } from "./dropType.js";
function createType(mOptions) {
  const _create = (typeName, options) => {
    if (Array.isArray(options)) {
      const optionsStr = options.map(escapeValue).join(", ");
      const typeNameStr = mOptions.literal(typeName);
      return `CREATE TYPE ${typeNameStr} AS ENUM (${optionsStr});`;
    }
    const attributes = Object.entries(options).map(([attributeName, attribute]) => {
      const typeStr = applyType(attribute, mOptions.typeShorthands).type;
      return `${mOptions.literal(attributeName)} ${typeStr}`;
    }).join(",\n");
    return `CREATE TYPE ${mOptions.literal(typeName)} AS (
${attributes}
);`;
  };
  _create.reverse = dropType(mOptions);
  return _create;
}
export {
  createType
};
