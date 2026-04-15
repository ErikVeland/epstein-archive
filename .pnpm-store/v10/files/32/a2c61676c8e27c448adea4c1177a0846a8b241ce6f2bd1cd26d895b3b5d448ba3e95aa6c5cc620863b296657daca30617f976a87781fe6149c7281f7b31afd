import { escapeValue } from "../../utils.js";
function alterDomain(mOptions) {
  const _alter = (domainName, options) => {
    const {
      default: defaultValue,
      notNull,
      allowNull = false,
      check,
      constraintName
    } = options;
    const actions = [];
    if (defaultValue === null) {
      actions.push("DROP DEFAULT");
    } else if (defaultValue !== void 0) {
      actions.push(`SET DEFAULT ${escapeValue(defaultValue)}`);
    }
    if (notNull) {
      actions.push("SET NOT NULL");
    } else if (notNull === false || allowNull) {
      actions.push("DROP NOT NULL");
    }
    if (check) {
      actions.push(
        `${constraintName ? `CONSTRAINT ${mOptions.literal(constraintName)} ` : ""}CHECK (${check})`
      );
    }
    return `${actions.map((action) => `ALTER DOMAIN ${mOptions.literal(domainName)} ${action}`).join(";\n")};`;
  };
  return _alter;
}
export {
  alterDomain
};
