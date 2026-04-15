import { dropSchema } from "./dropSchema.js";
function createSchema(mOptions) {
  const _create = (schemaName, options = {}) => {
    const { ifNotExists = false, authorization } = options;
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const schemaNameStr = mOptions.literal(schemaName);
    const authorizationStr = authorization ? ` AUTHORIZATION ${authorization}` : "";
    return `CREATE SCHEMA${ifNotExistsStr} ${schemaNameStr}${authorizationStr};`;
  };
  _create.reverse = dropSchema(mOptions);
  return _create;
}
export {
  createSchema
};
