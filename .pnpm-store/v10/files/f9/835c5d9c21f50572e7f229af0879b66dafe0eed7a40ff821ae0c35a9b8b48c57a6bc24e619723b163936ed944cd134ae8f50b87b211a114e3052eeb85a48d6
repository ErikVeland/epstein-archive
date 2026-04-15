import { applyType, escapeValue } from "../../utils.js";
import { dropDomain } from "./dropDomain.js";
function createDomain(mOptions) {
  const _create = (domainName, type, options = {}) => {
    const {
      default: defaultValue,
      collation,
      notNull = false,
      check,
      constraintName
    } = options;
    const constraints = [];
    if (collation) {
      constraints.push(`COLLATE ${collation}`);
    }
    if (defaultValue !== void 0) {
      constraints.push(`DEFAULT ${escapeValue(defaultValue)}`);
    }
    if (notNull && check) {
      throw new Error(`"notNull" and "check" can't be specified together`);
    } else if (notNull || check) {
      if (constraintName) {
        constraints.push(`CONSTRAINT ${mOptions.literal(constraintName)}`);
      }
      if (notNull) {
        constraints.push("NOT NULL");
      } else if (check) {
        constraints.push(`CHECK (${check})`);
      }
    }
    const constraintsStr = constraints.length > 0 ? ` ${constraints.join(" ")}` : "";
    const typeStr = applyType(type, mOptions.typeShorthands).type;
    const domainNameStr = mOptions.literal(domainName);
    return `CREATE DOMAIN ${domainNameStr} AS ${typeStr}${constraintsStr};`;
  };
  _create.reverse = (domainName, type, options) => dropDomain(mOptions)(domainName, options);
  return _create;
}
export {
  createDomain
};
