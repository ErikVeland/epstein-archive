import { formatParams } from "../../utils.js";
function renameFunction(mOptions) {
  const _rename = (oldFunctionName, functionParams = [], newFunctionName) => {
    const paramsStr = formatParams(functionParams, mOptions);
    const oldFunctionNameStr = mOptions.literal(oldFunctionName);
    const newFunctionNameStr = mOptions.literal(newFunctionName);
    return `ALTER FUNCTION ${oldFunctionNameStr}${paramsStr} RENAME TO ${newFunctionNameStr};`;
  };
  _rename.reverse = (oldFunctionName, functionParams, newFunctionName) => _rename(newFunctionName, functionParams, oldFunctionName);
  return _rename;
}
export {
  renameFunction
};
