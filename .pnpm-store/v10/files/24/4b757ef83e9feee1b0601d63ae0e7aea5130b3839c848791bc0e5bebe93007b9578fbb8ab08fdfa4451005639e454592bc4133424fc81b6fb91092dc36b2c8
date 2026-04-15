import { removeFromOperatorFamily } from "./removeFromOperatorFamily.js";
import { operatorMap } from "./shared.js";
const addToOperatorFamily = (mOptions) => {
  const method = (operatorFamilyName, indexMethod, operatorList) => {
    const operatorFamilyNameStr = mOptions.literal(operatorFamilyName);
    const operatorListStr = operatorList.map(operatorMap(mOptions)).join(",\n  ");
    return `ALTER OPERATOR FAMILY ${operatorFamilyNameStr} USING ${indexMethod} ADD
  ${operatorListStr};`;
  };
  method.reverse = removeFromOperatorFamily(mOptions);
  return method;
};
export {
  addToOperatorFamily
};
