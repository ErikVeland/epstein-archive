import { toArray } from "./toArray.js";
function getSchemas(schema) {
  const schemas = toArray(schema).filter(
    (s) => typeof s === "string" && s.length > 0
  );
  return schemas.length > 0 ? schemas : ["public"];
}
export {
  getSchemas
};
