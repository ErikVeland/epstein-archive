import { toArray } from "./toArray.js";
function formatPartitionColumn(column, literal) {
  if (typeof column === "string") {
    return literal(column);
  }
  let formatted = literal(column.name);
  if (column.collate) {
    formatted += ` COLLATE ${column.collate}`;
  }
  if (column.opclass) {
    formatted += ` ${column.opclass}`;
  }
  return formatted;
}
function formatPartitionColumns(partition, literal) {
  const columns = toArray(partition.columns);
  return columns.map((col) => formatPartitionColumn(col, literal)).join(", ");
}
export {
  formatPartitionColumns
};
