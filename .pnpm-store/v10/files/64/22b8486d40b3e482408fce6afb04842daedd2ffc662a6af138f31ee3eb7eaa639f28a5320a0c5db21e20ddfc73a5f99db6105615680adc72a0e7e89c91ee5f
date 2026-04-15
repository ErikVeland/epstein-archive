import { toArray } from "../../utils.js";
import { generateIndexName } from "./shared.js";
function dropIndex(mOptions) {
  const _drop = (tableName, rawColumns, options = {}) => {
    const { concurrently = false, ifExists = false, cascade = false } = options;
    const columns = toArray(rawColumns);
    const concurrentlyStr = concurrently ? " CONCURRENTLY" : "";
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const indexName = generateIndexName(
      tableName,
      columns,
      options,
      mOptions.schemalize
    );
    const cascadeStr = cascade ? " CASCADE" : "";
    const indexNameStr = mOptions.literal(indexName);
    return `DROP INDEX${concurrentlyStr}${ifExistsStr} ${indexNameStr}${cascadeStr};`;
  };
  return _drop;
}
export {
  dropIndex
};
