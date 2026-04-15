import { applyType } from "../../utils.js";
import { dropOperatorClass } from "./dropOperatorClass.js";
import { operatorMap } from "./shared.js";
function createOperatorClass(mOptions) {
  const _create = (operatorClassName, type, indexMethod, operatorList, options) => {
    const { default: isDefault, family } = options;
    const operatorClassNameStr = mOptions.literal(operatorClassName);
    const defaultStr = isDefault ? " DEFAULT" : "";
    const typeStr = mOptions.literal(applyType(type).type);
    const indexMethodStr = mOptions.literal(indexMethod);
    const familyStr = family ? ` FAMILY ${family}` : "";
    const operatorListStr = operatorList.map(operatorMap(mOptions)).join(",\n  ");
    return `CREATE OPERATOR CLASS ${operatorClassNameStr}${defaultStr} FOR TYPE ${typeStr} USING ${indexMethodStr}${familyStr} AS
  ${operatorListStr};`;
  };
  _create.reverse = (operatorClassName, type, indexMethod, operatorList, options) => dropOperatorClass(mOptions)(operatorClassName, indexMethod, options);
  return _create;
}
export {
  createOperatorClass
};
