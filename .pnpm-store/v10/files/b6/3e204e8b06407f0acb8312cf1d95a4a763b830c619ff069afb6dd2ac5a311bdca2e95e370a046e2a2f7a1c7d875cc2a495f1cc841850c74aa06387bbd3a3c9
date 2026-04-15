import { dataClause } from "./shared.js";
function refreshMaterializedView(mOptions) {
  const _refresh = (viewName, options = {}) => {
    const { concurrently = false, data } = options;
    const concurrentlyStr = concurrently ? " CONCURRENTLY" : "";
    const dataStr = dataClause(data);
    const viewNameStr = mOptions.literal(viewName);
    return `REFRESH MATERIALIZED VIEW${concurrentlyStr} ${viewNameStr}${dataStr};`;
  };
  _refresh.reverse = _refresh;
  return _refresh;
}
export {
  refreshMaterializedView
};
