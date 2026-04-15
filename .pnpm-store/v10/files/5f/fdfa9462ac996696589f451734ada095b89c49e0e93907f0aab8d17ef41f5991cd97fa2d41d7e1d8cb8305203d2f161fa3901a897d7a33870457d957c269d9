import { formatLines } from "../../utils.js";
import { dropColumns } from "./dropColumns.js";
import { parseColumns } from "./shared.js";
function addColumns(mOptions) {
  const _add = (tableName, columns, options = {}) => {
    const { ifNotExists = false } = options;
    const { columns: columnLines, comments: columnComments = [] } = parseColumns(tableName, columns, mOptions);
    const ifNotExistsStr = ifNotExists ? "IF NOT EXISTS " : "";
    const columnsStr = formatLines(columnLines, `  ADD ${ifNotExistsStr}`);
    const tableNameStr = mOptions.literal(tableName);
    const alterTableQuery = `ALTER TABLE ${tableNameStr}
${columnsStr};`;
    const columnCommentsStr = columnComments.length > 0 ? `
${columnComments.join("\n")}` : "";
    return `${alterTableQuery}${columnCommentsStr}`;
  };
  _add.reverse = dropColumns(mOptions);
  return _add;
}
export {
  addColumns
};
