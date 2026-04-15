import { applyType, escapeValue, makeComment, toArray } from "../../utils.js";
import { parseSequenceOptions } from "../sequences.js";
function parseReferences(options, literal) {
  const { references, match, onDelete, onUpdate } = options;
  const clauses = [];
  clauses.push(
    typeof references === "string" && (references.startsWith('"') || references.endsWith(")")) ? `REFERENCES ${references}` : `REFERENCES ${literal(references)}`
  );
  if (match) {
    clauses.push(`MATCH ${match}`);
  }
  if (onDelete) {
    clauses.push(`ON DELETE ${onDelete}`);
  }
  if (onUpdate) {
    clauses.push(`ON UPDATE ${onUpdate}`);
  }
  return clauses.join(" ");
}
function parseDeferrable(options) {
  return `DEFERRABLE INITIALLY ${options.deferred ? "DEFERRED" : "IMMEDIATE"}`;
}
function parseColumns(tableName, columns, mOptions) {
  const extendingTypeShorthands = mOptions.typeShorthands;
  let columnsWithOptions = Object.keys(columns).reduce(
    (previous, column) => ({
      ...previous,
      [column]: applyType(columns[column], extendingTypeShorthands)
    }),
    {}
  );
  const primaryColumns = Object.entries(columnsWithOptions).filter(([, { primaryKey }]) => Boolean(primaryKey)).map(([columnName]) => columnName);
  const multiplePrimaryColumns = primaryColumns.length > 1;
  if (multiplePrimaryColumns) {
    columnsWithOptions = Object.fromEntries(
      Object.entries(columnsWithOptions).map(([columnName, options]) => [
        columnName,
        {
          ...options,
          primaryKey: false
        }
      ])
    );
  }
  const comments = Object.entries(columnsWithOptions).map(([columnName, { comment }]) => {
    return comment !== void 0 && makeComment(
      "COLUMN",
      `${mOptions.literal(tableName)}.${mOptions.literal(columnName)}`,
      comment
    );
  }).filter((comment) => Boolean(comment));
  return {
    columns: Object.entries(columnsWithOptions).map(([columnName, options]) => {
      const {
        type,
        collation,
        default: defaultValue,
        unique,
        primaryKey,
        notNull,
        check,
        references,
        referencesConstraintName,
        referencesConstraintComment,
        deferrable,
        expressionGenerated
      } = options;
      const sequenceGenerated = options.sequenceGenerated;
      const constraints = [];
      if (collation) {
        constraints.push(`COLLATE ${collation}`);
      }
      if (defaultValue !== void 0) {
        constraints.push(`DEFAULT ${escapeValue(defaultValue)}`);
      }
      if (unique) {
        constraints.push("UNIQUE");
      }
      if (primaryKey) {
        constraints.push("PRIMARY KEY");
      }
      if (notNull) {
        constraints.push("NOT NULL");
      }
      if (check) {
        constraints.push(`CHECK (${check})`);
      }
      if (references) {
        const name = referencesConstraintName || (referencesConstraintComment ? `${tableName}_fk_${columnName}` : "");
        const constraintName = name ? `CONSTRAINT ${mOptions.literal(name)} ` : "";
        constraints.push(
          `${constraintName}${parseReferences(options, mOptions.literal)}`
        );
        if (referencesConstraintComment) {
          comments.push(
            makeComment(
              `CONSTRAINT ${mOptions.literal(name)} ON`,
              mOptions.literal(tableName),
              referencesConstraintComment
            )
          );
        }
      }
      if (deferrable) {
        constraints.push(parseDeferrable(options));
      }
      if (sequenceGenerated) {
        const sequenceOptions = parseSequenceOptions(
          extendingTypeShorthands,
          sequenceGenerated
        ).join(" ");
        constraints.push(
          `GENERATED ${sequenceGenerated.precedence} AS IDENTITY${sequenceOptions ? ` (${sequenceOptions})` : ""}`
        );
      }
      if (expressionGenerated) {
        constraints.push(`GENERATED ALWAYS AS (${expressionGenerated}) STORED`);
      }
      const constraintsStr = constraints.length > 0 ? ` ${constraints.join(" ")}` : "";
      const sType = typeof type === "object" ? mOptions.literal(type) : type;
      return `${mOptions.literal(columnName)} ${sType}${constraintsStr}`;
    }),
    constraints: multiplePrimaryColumns ? { primaryKey: primaryColumns } : {},
    comments
  };
}
function parseConstraints(table, options, optionName, literal) {
  const {
    check,
    unique,
    primaryKey,
    foreignKeys,
    exclude,
    deferrable,
    comment
  } = options;
  const tableName = typeof table === "object" ? table.name : table;
  let constraints = [];
  const comments = [];
  if (check) {
    if (Array.isArray(check)) {
      for (const [i, ch] of check.entries()) {
        const name = literal(optionName || `${tableName}_chck_${i + 1}`);
        constraints.push(`CONSTRAINT ${name} CHECK (${ch})`);
      }
    } else {
      const name = literal(optionName || `${tableName}_chck`);
      constraints.push(`CONSTRAINT ${name} CHECK (${check})`);
    }
  }
  if (unique) {
    const uniqueArray = toArray(unique);
    const isArrayOfArrays = uniqueArray.some(
      (uniqueSet) => Array.isArray(uniqueSet)
    );
    for (const uniqueSet of isArrayOfArrays ? uniqueArray : [uniqueArray]) {
      const cols = toArray(uniqueSet);
      const name = literal(optionName || `${tableName}_uniq_${cols.join("_")}`);
      constraints.push(
        `CONSTRAINT ${name} UNIQUE (${cols.map(literal).join(", ")})`
      );
    }
  }
  if (primaryKey) {
    const name = literal(optionName || `${tableName}_pkey`);
    const key = toArray(primaryKey).map(literal).join(", ");
    constraints.push(`CONSTRAINT ${name} PRIMARY KEY (${key})`);
  }
  if (foreignKeys) {
    for (const fk of toArray(foreignKeys)) {
      const { columns, referencesConstraintName, referencesConstraintComment } = fk;
      const cols = toArray(columns);
      const name = literal(
        referencesConstraintName || optionName || `${tableName}_fk_${cols.join("_")}`
      );
      const key = cols.map(literal).join(", ");
      const referencesStr = parseReferences(fk, literal);
      constraints.push(
        `CONSTRAINT ${name} FOREIGN KEY (${key}) ${referencesStr}`
      );
      if (referencesConstraintComment) {
        comments.push(
          makeComment(
            `CONSTRAINT ${name} ON`,
            literal(table),
            referencesConstraintComment
          )
        );
      }
    }
  }
  if (exclude) {
    const name = literal(optionName || `${tableName}_excl`);
    constraints.push(`CONSTRAINT ${name} EXCLUDE ${exclude}`);
  }
  if (deferrable) {
    constraints = constraints.map(
      (constraint) => `${constraint} ${parseDeferrable(options)}`
    );
  }
  if (comment) {
    if (!optionName) {
      throw new Error("cannot comment on unspecified constraints");
    }
    comments.push(
      makeComment(
        `CONSTRAINT ${literal(optionName)} ON`,
        literal(table),
        comment
      )
    );
  }
  return {
    constraints,
    comments
  };
}
function parseLike(like, literal) {
  const formatOptions = (name, options2) => toArray(options2).filter((option) => option !== void 0).map((option) => ` ${name} ${option}`).join("");
  const table = typeof like === "string" || !("table" in like) ? like : like.table;
  const options = typeof like === "string" || !("options" in like) || like.options === void 0 ? "" : [
    formatOptions("INCLUDING", like.options.including),
    formatOptions("EXCLUDING", like.options.excluding)
  ].join("");
  return `LIKE ${literal(table)}${options}`;
}
export {
  parseColumns,
  parseConstraints,
  parseDeferrable,
  parseLike,
  parseReferences
};
