import { escapeValue } from "../../utils.js";
function alterViewColumn(mOptions) {
  const _alter = (viewName, columnName, options) => {
    const { default: defaultValue } = options;
    const actions = [];
    if (defaultValue === null) {
      actions.push("DROP DEFAULT");
    } else if (defaultValue !== void 0) {
      actions.push(`SET DEFAULT ${escapeValue(defaultValue)}`);
    }
    const viewNameStr = mOptions.literal(viewName);
    const columnNameStr = mOptions.literal(columnName);
    return actions.map(
      (action) => `ALTER VIEW ${viewNameStr} ALTER COLUMN ${columnNameStr} ${action};`
    ).join("\n");
  };
  return _alter;
}
export {
  alterViewColumn
};
