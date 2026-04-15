import { formatLines } from "../../utils.js";
function alterTable(mOptions) {
  const _alter = (tableName, options) => {
    const { levelSecurity, unlogged } = options;
    const alterDefinition = [];
    if (levelSecurity) {
      alterDefinition.push(`${levelSecurity} ROW LEVEL SECURITY`);
    }
    if (unlogged === true) {
      alterDefinition.push(`SET UNLOGGED`);
    } else if (unlogged === false) {
      alterDefinition.push(`SET LOGGED`);
    }
    return `ALTER TABLE ${mOptions.literal(tableName)}
  ${formatLines(alterDefinition)};`;
  };
  return _alter;
}
export {
  alterTable
};
