import { toArray } from "../../utils.js";
import { dropMaterializedView } from "./dropMaterializedView.js";
import { dataClause, storageParameterStr } from "./shared.js";
function createMaterializedView(mOptions) {
  const _create = (viewName, options, definition) => {
    const {
      ifNotExists = false,
      columns = [],
      tablespace,
      storageParameters = {},
      data
    } = options;
    const columnNames = toArray(columns).map(mOptions.literal).join(", ");
    const withOptions = Object.keys(storageParameters).map(storageParameterStr(storageParameters)).join(", ");
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const columnsStr = columnNames ? `(${columnNames})` : "";
    const withOptionsStr = withOptions ? ` WITH (${withOptions})` : "";
    const tablespaceStr = tablespace ? ` TABLESPACE ${mOptions.literal(tablespace)}` : "";
    const dataStr = dataClause(data);
    const viewNameStr = mOptions.literal(viewName);
    return `CREATE MATERIALIZED VIEW${ifNotExistsStr} ${viewNameStr}${columnsStr}${withOptionsStr}${tablespaceStr} AS ${definition}${dataStr};`;
  };
  _create.reverse = dropMaterializedView(mOptions);
  return _create;
}
export {
  createMaterializedView
};
