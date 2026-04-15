import { toArray } from "../../utils.js";
import { dropIndex } from "./dropIndex.js";
import { generateColumnsString, generateIndexName } from "./shared.js";
function createIndex(mOptions) {
  const _create = (tableName, rawColumns, options = {}) => {
    const {
      unique = false,
      concurrently = false,
      ifNotExists = false,
      method,
      where,
      include
    } = options;
    const columns = toArray(rawColumns);
    const indexName = generateIndexName(
      typeof tableName === "object" ? tableName.name : tableName,
      columns,
      options,
      mOptions.schemalize
    );
    const columnsString = generateColumnsString(columns, mOptions);
    const uniqueStr = unique ? " UNIQUE" : "";
    const concurrentlyStr = concurrently ? " CONCURRENTLY" : "";
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const methodStr = method ? ` USING ${method}` : "";
    const whereStr = where ? ` WHERE ${where}` : "";
    const includeStr = include ? ` INCLUDE (${toArray(include).map(mOptions.literal).join(", ")})` : "";
    const indexNameStr = mOptions.literal(indexName);
    const tableNameStr = mOptions.literal(tableName);
    return `CREATE${uniqueStr} INDEX${concurrentlyStr}${ifNotExistsStr} ${indexNameStr} ON ${tableNameStr}${methodStr} (${columnsString})${includeStr}${whereStr};`;
  };
  _create.reverse = dropIndex(mOptions);
  return _create;
}
export {
  createIndex
};
