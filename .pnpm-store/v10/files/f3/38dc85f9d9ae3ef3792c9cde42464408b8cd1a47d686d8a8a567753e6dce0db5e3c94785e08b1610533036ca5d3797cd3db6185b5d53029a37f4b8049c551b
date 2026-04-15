import { viewOptionStr } from "./shared.js";
function alterView(mOptions) {
  const _alter = (viewName, viewOptions) => {
    const { checkOption, options = {} } = viewOptions;
    if (checkOption !== void 0) {
      if (options.check_option === void 0) {
        options.check_option = checkOption;
      } else {
        throw new Error(
          `"options.check_option" and "checkOption" can't be specified together`
        );
      }
    }
    const clauses = [];
    const withOptions = Object.keys(options).filter((key) => options[key] !== null).map(viewOptionStr(options)).join(", ");
    if (withOptions) {
      clauses.push(`SET (${withOptions})`);
    }
    const resetOptions = Object.keys(options).filter((key) => options[key] === null).join(", ");
    if (resetOptions) {
      clauses.push(`RESET (${resetOptions})`);
    }
    return clauses.map((clause) => `ALTER VIEW ${mOptions.literal(viewName)} ${clause};`).join("\n");
  };
  return _alter;
}
export {
  alterView
};
