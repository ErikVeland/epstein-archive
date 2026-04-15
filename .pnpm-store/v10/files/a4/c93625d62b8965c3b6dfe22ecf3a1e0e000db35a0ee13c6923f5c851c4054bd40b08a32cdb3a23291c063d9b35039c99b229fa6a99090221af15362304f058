import { formatLines } from "../../utils.js";
import { dropConstraint } from "./dropConstraint.js";
import { parseConstraints } from "./shared.js";
function addConstraint(mOptions) {
  const _add = (tableName, constraintName, expressionOrOptions) => {
    const { constraints, comments } = typeof expressionOrOptions === "string" ? {
      constraints: [
        `${constraintName ? `CONSTRAINT ${mOptions.literal(constraintName)} ` : ""}${expressionOrOptions}`
      ],
      comments: []
    } : parseConstraints(
      tableName,
      expressionOrOptions,
      constraintName,
      mOptions.literal
    );
    const constraintStr = formatLines(constraints, "  ADD ");
    return [
      `ALTER TABLE ${mOptions.literal(tableName)}
${constraintStr};`,
      ...comments
    ].join("\n");
  };
  _add.reverse = (tableName, constraintName, expressionOrOptions) => {
    if (constraintName === null) {
      throw new Error(
        "Impossible to automatically infer down migration for addConstraint without naming constraint"
      );
    }
    if (typeof expressionOrOptions === "string") {
      throw new Error(
        "Impossible to automatically infer down migration for addConstraint with raw SQL expression"
      );
    }
    return dropConstraint(mOptions)(
      tableName,
      constraintName,
      expressionOrOptions
    );
  };
  return _add;
}
export {
  addConstraint
};
