import { dropCast } from "./dropCast.js";
function createCast(mOptions) {
  const _create = (sourceType, targetType, options = {}) => {
    const { functionName, argumentTypes, inout = false, as } = options;
    let conversion = "";
    if (functionName) {
      const args = argumentTypes || [sourceType];
      conversion = ` WITH FUNCTION ${mOptions.literal(functionName)}(${args.join(", ")})`;
    } else if (inout) {
      conversion = " WITH INOUT";
    } else {
      conversion = " WITHOUT FUNCTION";
    }
    const implicit = as ? ` AS ${as}` : "";
    return `CREATE CAST (${sourceType} AS ${targetType})${conversion}${implicit};`;
  };
  _create.reverse = dropCast(mOptions);
  return _create;
}
export {
  createCast
};
