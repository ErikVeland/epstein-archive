import { formatParams } from "../../utils.js";
function operatorMap(mOptions) {
  return ({ type, number, name, params = [] }) => {
    const nameStr = mOptions.literal(name);
    if (String(type).toLowerCase() === "operator") {
      if (params.length > 2) {
        throw new Error("Operator can't have more than 2 parameters");
      }
      const paramsStr = params.length > 0 ? formatParams(params, mOptions) : "";
      return `OPERATOR ${number} ${nameStr}${paramsStr}`;
    }
    if (String(type).toLowerCase() === "function") {
      const paramsStr = formatParams(params, mOptions);
      return `FUNCTION ${number} ${nameStr}${paramsStr}`;
    }
    throw new Error('Operator "type" must be either "function" or "operator"');
  };
}
export {
  operatorMap
};
