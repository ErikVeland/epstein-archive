import { escapeValue, formatParams } from "../../utils.js";
import { dropFunction } from "./dropFunction.js";
function createFunction(mOptions) {
  const _create = (functionName, functionParams = [], functionOptions, definition) => {
    const {
      replace = false,
      returns = "void",
      language,
      window = false,
      behavior = "VOLATILE",
      security = "INVOKER",
      onNull = false,
      parallel,
      set
    } = functionOptions;
    const options = [];
    if (behavior) {
      options.push(behavior);
    }
    if (language) {
      options.push(`LANGUAGE ${language}`);
    } else {
      throw new Error(
        `Language for function ${functionName} have to be specified`
      );
    }
    if (security !== "INVOKER") {
      options.push(`SECURITY ${security}`);
    }
    if (window) {
      options.push("WINDOW");
    }
    if (onNull) {
      options.push("RETURNS NULL ON NULL INPUT");
    }
    if (parallel) {
      options.push(`PARALLEL ${parallel}`);
    }
    if (set) {
      for (const { configurationParameter, value } of set) {
        if (value === "FROM CURRENT") {
          options.push(
            `SET ${mOptions.literal(configurationParameter)} FROM CURRENT`
          );
        } else {
          options.push(
            `SET ${mOptions.literal(configurationParameter)} TO ${value}`
          );
        }
      }
    }
    const replaceStr = replace ? " OR REPLACE" : "";
    const paramsStr = formatParams(functionParams, mOptions);
    const functionNameStr = mOptions.literal(functionName);
    return `CREATE${replaceStr} FUNCTION ${functionNameStr}${paramsStr}
  RETURNS ${returns}
  AS ${escapeValue(definition)}
  ${options.join("\n  ")};`;
  };
  _create.reverse = dropFunction(mOptions);
  return _create;
}
export {
  createFunction
};
