import { escapeValue } from ".";
function createTransformer(literal) {
  return (statement, mapping = {}) => Object.keys(mapping).reduce((str, param) => {
    const val = mapping?.[param];
    return str.replace(
      new RegExp(`{${param}}`, "g"),
      val === void 0 ? "" : typeof val === "string" || typeof val === "object" && val !== null && "name" in val ? literal(val) : String(escapeValue(val)).replace(/\$/g, "$$$$")
    );
  }, statement);
}
export {
  createTransformer
};
