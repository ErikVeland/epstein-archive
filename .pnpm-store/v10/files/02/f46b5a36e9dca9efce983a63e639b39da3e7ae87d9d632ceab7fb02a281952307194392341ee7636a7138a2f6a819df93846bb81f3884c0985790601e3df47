const TYPE_ADAPTERS = Object.freeze({
  int: "integer",
  string: "text",
  float: "real",
  double: "double precision",
  datetime: "timestamp",
  bool: "boolean"
});
const DEFAULT_TYPE_SHORTHANDS = Object.freeze({
  id: { type: "serial", primaryKey: true }
  // convenience type for serial primary keys
});
function applyTypeAdapters(type) {
  return type in TYPE_ADAPTERS ? TYPE_ADAPTERS[type] : type;
}
function toType(type) {
  return typeof type === "string" ? { type } : type;
}
function removeType({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type,
  ...rest
}) {
  return rest;
}
function applyType(type, extendingTypeShorthands = {}) {
  const typeShorthands = {
    ...DEFAULT_TYPE_SHORTHANDS,
    ...extendingTypeShorthands
  };
  const options = toType(type);
  let ext = null;
  const types = [options.type];
  while (typeShorthands[types[types.length - 1]]) {
    ext = {
      ...toType(typeShorthands[types[types.length - 1]]),
      ...ext === null ? {} : removeType(ext)
    };
    if (types.includes(ext.type)) {
      throw new Error(
        `Shorthands contain cyclic dependency: ${types.join(", ")}, ${ext.type}`
      );
    } else {
      types.push(ext.type);
    }
  }
  return {
    ...ext,
    ...options,
    type: applyTypeAdapters(ext?.type ?? options.type)
  };
}
export {
  applyType,
  applyTypeAdapters
};
