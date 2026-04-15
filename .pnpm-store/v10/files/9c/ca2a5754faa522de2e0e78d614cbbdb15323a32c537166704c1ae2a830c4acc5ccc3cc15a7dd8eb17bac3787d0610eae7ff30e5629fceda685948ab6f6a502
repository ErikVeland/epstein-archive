import { toArray } from "../../utils.js";
import { dropExtension } from "./dropExtension.js";
function createExtension(mOptions) {
  const _create = (_extensions, options = {}) => {
    const { ifNotExists = false, schema } = options;
    const extensions = toArray(_extensions);
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const schemaStr = schema ? ` SCHEMA ${mOptions.literal(schema)}` : "";
    return extensions.map((extension) => {
      const extensionStr = mOptions.literal(extension);
      return `CREATE EXTENSION${ifNotExistsStr} ${extensionStr}${schemaStr};`;
    });
  };
  _create.reverse = dropExtension(mOptions);
  return _create;
}
export {
  createExtension
};
