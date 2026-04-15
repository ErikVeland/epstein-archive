import { dropOperator } from "./dropOperator.js";
function createOperator(mOptions) {
  const _create = (operatorName, options) => {
    const {
      procedure,
      left,
      right,
      commutator,
      negator,
      restrict,
      join,
      hashes = false,
      merges = false
    } = options;
    const defs = [];
    defs.push(`PROCEDURE = ${mOptions.literal(procedure)}`);
    if (left) {
      defs.push(`LEFTARG = ${mOptions.literal(left)}`);
    }
    if (right) {
      defs.push(`RIGHTARG = ${mOptions.literal(right)}`);
    }
    if (commutator) {
      defs.push(`COMMUTATOR = ${mOptions.schemalize(commutator)}`);
    }
    if (negator) {
      defs.push(`NEGATOR = ${mOptions.schemalize(negator)}`);
    }
    if (restrict) {
      defs.push(`RESTRICT = ${mOptions.literal(restrict)}`);
    }
    if (join) {
      defs.push(`JOIN = ${mOptions.literal(join)}`);
    }
    if (hashes) {
      defs.push("HASHES");
    }
    if (merges) {
      defs.push("MERGES");
    }
    const operatorNameStr = mOptions.schemalize(operatorName);
    return `CREATE OPERATOR ${operatorNameStr} (${defs.join(", ")});`;
  };
  _create.reverse = dropOperator(mOptions);
  return _create;
}
export {
  createOperator
};
