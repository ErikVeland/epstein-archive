import { dropOperatorFamily } from "./dropOperatorFamily.js";
function createOperatorFamily(mOptions) {
  const _create = (operatorFamilyName, indexMethod) => {
    const operatorFamilyNameStr = mOptions.literal(operatorFamilyName);
    return `CREATE OPERATOR FAMILY ${operatorFamilyNameStr} USING ${indexMethod};`;
  };
  _create.reverse = dropOperatorFamily(mOptions);
  return _create;
}
export {
  createOperatorFamily
};
