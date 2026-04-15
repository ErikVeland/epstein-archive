import { escapeValue, toArray } from "../../utils.js";
import { createFunction, dropFunction } from "../functions.js";
import { dropTrigger } from "./dropTrigger.js";
function createTrigger(mOptions) {
  const _create = (tableName, triggerName, triggerOptions, definition) => {
    const {
      constraint = false,
      condition,
      operation,
      deferrable = false,
      deferred = false,
      functionParams = []
    } = triggerOptions;
    let { when, level = "STATEMENT", function: functionName } = triggerOptions;
    const operations = toArray(operation).join(" OR ");
    if (constraint) {
      when = "AFTER";
    }
    if (!when) {
      throw new Error('"when" (BEFORE/AFTER/INSTEAD OF) have to be specified');
    }
    const isInsteadOf = /instead\s+of/i.test(when);
    if (isInsteadOf) {
      level = "ROW";
    }
    if (definition) {
      functionName = functionName === void 0 ? triggerName : functionName;
    }
    if (!functionName) {
      throw new Error("Can't determine function name");
    }
    if (isInsteadOf && condition) {
      throw new Error("INSTEAD OF trigger can't have condition specified");
    }
    if (!operations) {
      throw new Error(
        '"operation" (INSERT/UPDATE[ OF ...]/DELETE/TRUNCATE) have to be specified'
      );
    }
    const defferStr = constraint ? `${deferrable ? `DEFERRABLE INITIALLY ${deferred ? "DEFERRED" : "IMMEDIATE"}` : "NOT DEFERRABLE"}
  ` : "";
    const conditionClause = condition ? `WHEN (${condition})
  ` : "";
    const constraintStr = constraint ? " CONSTRAINT" : "";
    const paramsStr = functionParams.map(escapeValue).join(", ");
    const triggerNameStr = mOptions.literal(triggerName);
    const tableNameStr = mOptions.literal(tableName);
    const functionNameStr = mOptions.literal(functionName);
    const triggerSQL = `CREATE${constraintStr} TRIGGER ${triggerNameStr}
  ${when} ${operations} ON ${tableNameStr}
  ${defferStr}FOR EACH ${level}
  ${conditionClause}EXECUTE PROCEDURE ${functionNameStr}(${paramsStr});`;
    const fnSQL = definition ? `${createFunction(mOptions)(
      functionName,
      [],
      { ...triggerOptions, returns: "trigger" },
      definition
    )}
` : "";
    return `${fnSQL}${triggerSQL}`;
  };
  _create.reverse = (tableName, triggerName, triggerOptions, definition) => {
    const triggerSQL = dropTrigger(mOptions)(
      tableName,
      triggerName,
      triggerOptions
    );
    const fnSQL = definition ? `
${dropFunction(mOptions)(triggerOptions.function || triggerName, [], triggerOptions)}` : "";
    return `${triggerSQL}${fnSQL}`;
  };
  return _create;
}
export {
  createTrigger
};
