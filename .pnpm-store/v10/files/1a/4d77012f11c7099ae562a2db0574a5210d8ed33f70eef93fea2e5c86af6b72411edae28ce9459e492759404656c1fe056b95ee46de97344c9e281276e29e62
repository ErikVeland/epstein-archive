import { dropSequence } from "./dropSequence.js";
import { parseSequenceOptions } from "./shared.js";
function createSequence(mOptions) {
  const _create = (sequenceName, options = {}) => {
    const { temporary = false, ifNotExists = false } = options;
    const temporaryStr = temporary ? " TEMPORARY" : "";
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const sequenceNameStr = mOptions.literal(sequenceName);
    const clausesStr = parseSequenceOptions(
      mOptions.typeShorthands,
      options
    ).join("\n  ");
    return `CREATE${temporaryStr} SEQUENCE${ifNotExistsStr} ${sequenceNameStr}
  ${clausesStr};`;
  };
  _create.reverse = dropSequence(mOptions);
  return _create;
}
export {
  createSequence
};
