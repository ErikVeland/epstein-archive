import { decamelize } from "./decamelize.js";
import { identity } from "./identity.js";
import { quote } from "./quote.js";
function createSchemalize(options) {
  const { shouldDecamelize, shouldQuote } = options;
  const transform = [
    shouldDecamelize ? decamelize : identity,
    shouldQuote ? quote : identity
  ].reduce((acc, fn) => fn === identity ? acc : (str) => acc(fn(str)));
  return (value) => {
    if (typeof value === "object") {
      const { schema, name } = value;
      return (schema ? `${transform(schema)}.` : "") + transform(name);
    }
    return transform(value);
  };
}
export {
  createSchemalize
};
