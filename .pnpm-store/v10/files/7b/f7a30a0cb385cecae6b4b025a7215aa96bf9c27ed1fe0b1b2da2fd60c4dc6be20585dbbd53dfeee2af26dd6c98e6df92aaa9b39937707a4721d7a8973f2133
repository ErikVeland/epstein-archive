import { toArray } from "../../utils.js";
import { dropView } from "./dropView.js";
import { viewOptionStr } from "./shared.js";
function createView(mOptions) {
  const _create = (viewName, viewOptions, definition) => {
    const {
      temporary = false,
      replace = false,
      recursive = false,
      columns = [],
      options = {},
      checkOption
    } = viewOptions;
    const columnNames = toArray(columns).map(mOptions.literal).join(", ");
    const withOptions = Object.keys(options).map(viewOptionStr(options)).join(", ");
    const replaceStr = replace ? " OR REPLACE" : "";
    const temporaryStr = temporary ? " TEMPORARY" : "";
    const recursiveStr = recursive ? " RECURSIVE" : "";
    const columnStr = columnNames ? `(${columnNames})` : "";
    const withOptionsStr = withOptions ? ` WITH (${withOptions})` : "";
    const checkOptionStr = checkOption ? ` WITH ${checkOption} CHECK OPTION` : "";
    const viewNameStr = mOptions.literal(viewName);
    return `CREATE${replaceStr}${temporaryStr}${recursiveStr} VIEW ${viewNameStr}${columnStr}${withOptionsStr} AS ${definition}${checkOptionStr};`;
  };
  _create.reverse = dropView(mOptions);
  return _create;
}
export {
  createView
};
