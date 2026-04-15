import { operatorMap } from "./shared.js";
const removeFromOperatorFamily = (mOptions) => {
  const method = (operatorFamilyName, indexMethod, operatorList) => {
    const operatorFamilyNameStr = mOptions.literal(operatorFamilyName);
    const operatorListStr = operatorList.map(operatorMap(mOptions)).join(",\n  ");
    return `ALTER OPERATOR FAMILY ${operatorFamilyNameStr} USING ${indexMethod} DROP
  ${operatorListStr};`;
  };
  return method;
};
export {
  removeFromOperatorFamily
};
