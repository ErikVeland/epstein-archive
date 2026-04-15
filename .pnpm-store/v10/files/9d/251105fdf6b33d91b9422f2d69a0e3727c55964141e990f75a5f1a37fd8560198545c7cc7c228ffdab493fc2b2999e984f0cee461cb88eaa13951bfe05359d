import { applyType, escapeValue } from ".";
function formatParam(mOptions) {
  return (param) => {
    const {
      mode,
      name,
      type,
      default: defaultValue
    } = applyType(param, mOptions.typeShorthands);
    const options = [];
    if (mode) {
      options.push(mode);
    }
    if (name) {
      options.push(mOptions.literal(name));
    }
    if (type) {
      options.push(type);
    }
    if (defaultValue) {
      options.push(`DEFAULT ${escapeValue(defaultValue)}`);
    }
    return options.join(" ");
  };
}
function formatParams(params, mOptions) {
  return `(${params.map(formatParam(mOptions)).join(", ")})`;
}
export {
  formatParams
};
