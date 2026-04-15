import { formatLines } from "../../utils.js";
function dropColumns(mOptions) {
  const _drop = (tableName, columns, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    if (typeof columns === "string") {
      columns = [columns];
    } else if (!Array.isArray(columns) && typeof columns === "object") {
      columns = Object.keys(columns);
    }
    const ifExistsStr = ifExists ? "IF EXISTS " : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const lines = columns.map(mOptions.literal).map((column) => `DROP ${ifExistsStr}${column}${cascadeStr}`);
    return `ALTER TABLE ${mOptions.literal(tableName)}
${formatLines(lines)};`;
  };
  return _drop;
}
export {
  dropColumns
};
