import { toArray } from "../../utils.js";
function dropExtension(mOptions) {
  const _drop = (_extensions, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const extensions = toArray(_extensions);
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return extensions.map((extension) => {
      const extensionStr = mOptions.literal(extension);
      return `DROP EXTENSION${ifExistsStr} ${extensionStr}${cascadeStr};`;
    });
  };
  return _drop;
}
export {
  dropExtension
};
