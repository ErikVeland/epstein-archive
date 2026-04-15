function generateIndexName(table, columns, options, schemalize) {
  if (options.name) {
    return typeof table === "object" ? { schema: table.schema, name: options.name } : options.name;
  }
  const cols = columns.map((col) => schemalize(typeof col === "string" ? col : col.name)).join("_");
  const uniq = "unique" in options && options.unique ? "_unique" : "";
  return typeof table === "object" ? {
    schema: table.schema,
    name: `${table.name}_${cols}${uniq}_index`
  } : `${table}_${cols}${uniq}_index`;
}
function generateColumnString(column, mOptions) {
  const name = mOptions.schemalize(column);
  const isSpecial = /[ ().]/.test(name);
  return isSpecial ? name : mOptions.literal(name);
}
function generateColumnsString(columns, mOptions) {
  return columns.map(
    (column) => typeof column === "string" ? generateColumnString(column, mOptions) : [
      generateColumnString(column.name, mOptions),
      column.opclass ? mOptions.literal(column.opclass) : void 0,
      column.sort
    ].filter((s) => typeof s === "string" && s !== "").join(" ")
  ).join(", ");
}
export {
  generateColumnString,
  generateColumnsString,
  generateIndexName
};
