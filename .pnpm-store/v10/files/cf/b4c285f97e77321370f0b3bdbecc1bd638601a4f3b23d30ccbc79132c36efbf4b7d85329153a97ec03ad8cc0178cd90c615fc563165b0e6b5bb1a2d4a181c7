import { parseSequenceOptions } from "./shared.js";
function alterSequence(mOptions) {
  return (sequenceName, options) => {
    const { restart } = options;
    const clauses = parseSequenceOptions(mOptions.typeShorthands, options);
    if (restart) {
      if (restart === true) {
        clauses.push("RESTART");
      } else {
        clauses.push(`RESTART WITH ${restart}`);
      }
    }
    return `ALTER SEQUENCE ${mOptions.literal(sequenceName)}
  ${clauses.join("\n  ")};`;
  };
}
export {
  alterSequence
};
