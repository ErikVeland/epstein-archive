import { formatLines } from "../../utils.js";
import { storageParameterStr } from "./shared.js";
function alterMaterializedView(mOptions) {
  const _alter = (viewName, options) => {
    const { cluster, extension, storageParameters = {} } = options;
    const clauses = [];
    if (cluster !== void 0) {
      if (cluster) {
        clauses.push(`CLUSTER ON ${mOptions.literal(cluster)}`);
      } else {
        clauses.push("SET WITHOUT CLUSTER");
      }
    }
    if (extension) {
      clauses.push(`DEPENDS ON EXTENSION ${mOptions.literal(extension)}`);
    }
    const withOptions = Object.keys(storageParameters).filter((key) => storageParameters[key] !== null).map(storageParameterStr(storageParameters)).join(", ");
    if (withOptions) {
      clauses.push(`SET (${withOptions})`);
    }
    const resetOptions = Object.keys(storageParameters).filter((key) => storageParameters[key] === null).join(", ");
    if (resetOptions) {
      clauses.push(`RESET (${resetOptions})`);
    }
    const clausesStr = formatLines(clauses);
    const viewNameStr = mOptions.literal(viewName);
    return `ALTER MATERIALIZED VIEW ${viewNameStr}
${clausesStr};`;
  };
  return _alter;
}
export {
  alterMaterializedView
};
