import {
  applyTypeAdapters,
  escapeValue,
  formatLines,
  makeComment
} from "../../utils.js";
import { parseSequenceOptions } from "../sequences.js";
function alterColumn(mOptions) {
  return (tableName, columnName, options) => {
    const {
      default: defaultValue,
      type,
      collation,
      using,
      notNull,
      allowNull,
      comment,
      expressionGenerated
    } = options;
    const sequenceGenerated = options.sequenceGenerated;
    const actions = [];
    if (defaultValue === null) {
      actions.push("DROP DEFAULT");
    } else if (defaultValue !== void 0) {
      actions.push(`SET DEFAULT ${escapeValue(defaultValue)}`);
    }
    if (type) {
      const typeStr = applyTypeAdapters(type);
      const collationStr = collation ? ` COLLATE ${collation}` : "";
      const usingStr = using ? ` USING ${using}` : "";
      actions.push(`SET DATA TYPE ${typeStr}${collationStr}${usingStr}`);
    }
    if (notNull) {
      actions.push("SET NOT NULL");
    } else if (notNull === false || allowNull) {
      actions.push("DROP NOT NULL");
    }
    if (sequenceGenerated !== void 0) {
      if (sequenceGenerated) {
        const sequenceOptions = parseSequenceOptions(
          mOptions.typeShorthands,
          sequenceGenerated
        ).join(" ");
        actions.push(
          `ADD GENERATED ${sequenceGenerated.precedence} AS IDENTITY${sequenceOptions ? ` (${sequenceOptions})` : ""}`
        );
      } else {
        actions.push("DROP IDENTITY");
      }
    }
    if (expressionGenerated !== void 0) {
      if (typeof expressionGenerated === "string") {
        actions.push(`SET EXPRESSION AS (${expressionGenerated})`);
      }
      if (expressionGenerated === null) {
        actions.push("DROP EXPRESSION");
      }
    }
    const queries = [];
    if (actions.length > 0) {
      const columnsStr = formatLines(
        actions,
        `  ALTER ${mOptions.literal(columnName)} `
      );
      queries.push(
        `ALTER TABLE ${mOptions.literal(tableName)}
${columnsStr};`
      );
    }
    if (comment !== void 0) {
      queries.push(
        makeComment(
          "COLUMN",
          `${mOptions.literal(tableName)}.${mOptions.literal(columnName)}`,
          comment
        )
      );
    }
    return queries.join("\n");
  };
}
export {
  alterColumn
};
