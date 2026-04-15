import {
  formatLines,
  formatPartitionColumns,
  intersection,
  makeComment
} from "../../utils.js";
import { dropTable } from "./dropTable.js";
import { parseColumns, parseConstraints, parseLike } from "./shared.js";
function createTable(mOptions) {
  const _create = (tableName, columns, options = {}) => {
    const {
      temporary = false,
      ifNotExists = false,
      inherits,
      like,
      constraints: optionsConstraints = {},
      comment,
      partition,
      unlogged = false
    } = options;
    const {
      columns: columnLines,
      constraints: crossColumnConstraints,
      comments: columnComments = []
    } = parseColumns(tableName, columns, mOptions);
    const dupes = intersection(
      Object.keys(optionsConstraints),
      Object.keys(crossColumnConstraints)
    );
    if (dupes.length > 0) {
      const dupesStr = dupes.join(", ");
      throw new Error(
        `There is duplicate constraint definition in table and columns options: ${dupesStr}`
      );
    }
    const constraints = {
      ...optionsConstraints,
      ...crossColumnConstraints
    };
    const { constraints: constraintLines, comments: constraintComments } = parseConstraints(tableName, constraints, "", mOptions.literal);
    const tableDefinition = [
      ...columnLines,
      ...constraintLines,
      ...like ? [parseLike(like, mOptions.literal)] : []
    ];
    if (temporary && unlogged) {
      throw new Error("TEMPORARY and UNLOGGED cannot be used together.");
    }
    const temporaryStr = temporary ? " TEMPORARY" : "";
    const unloggedStr = unlogged ? " UNLOGGED" : "";
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const inheritsStr = inherits ? ` INHERITS (${mOptions.literal(inherits)})` : "";
    const partitionStr = partition ? ` PARTITION BY ${partition.strategy} (${formatPartitionColumns(partition, mOptions.literal)})` : "";
    const tableNameStr = mOptions.literal(tableName);
    const createTableQuery = `CREATE${temporaryStr}${unloggedStr} TABLE${ifNotExistsStr} ${tableNameStr} (
${formatLines(tableDefinition)}
)${inheritsStr}${partitionStr};`;
    const comments = [...columnComments, ...constraintComments];
    if (comment !== void 0) {
      comments.push(makeComment("TABLE", mOptions.literal(tableName), comment));
    }
    return `${createTableQuery}${comments.length > 0 ? `
${comments.join("\n")}` : ""}`;
  };
  _create.reverse = dropTable(mOptions);
  return _create;
}
export {
  createTable
};
