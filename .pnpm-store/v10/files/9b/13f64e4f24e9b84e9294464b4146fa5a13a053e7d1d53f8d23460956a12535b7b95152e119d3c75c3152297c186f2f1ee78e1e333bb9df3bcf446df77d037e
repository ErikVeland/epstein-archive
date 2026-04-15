import { createTransformer } from "../utils.js";
function sql(mOptions) {
  const t = createTransformer(mOptions.literal);
  return (sqlStr, args) => {
    let statement = t(sqlStr, args);
    if (statement.lastIndexOf(";") !== statement.length - 1) {
      statement += ";";
    }
    return statement;
  };
}
export {
  sql
};
