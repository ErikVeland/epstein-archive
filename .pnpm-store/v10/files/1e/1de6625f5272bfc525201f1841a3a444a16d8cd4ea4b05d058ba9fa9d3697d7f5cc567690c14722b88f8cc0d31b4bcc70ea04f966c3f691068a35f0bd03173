// src/migration.ts
import { glob } from "glob";
import { createReadStream, createWriteStream } from "fs";
import { mkdir, readdir } from "fs/promises";
import { basename, extname, join, resolve } from "path";
import { cwd } from "process";

// src/operations/casts/dropCast.ts
function dropCast(mOptions) {
  const _drop = (sourceType, targetType, options = {}) => {
    const { ifExists = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    return `DROP CAST${ifExistsStr} (${sourceType} AS ${targetType});`;
  };
  return _drop;
}

// src/operations/casts/createCast.ts
function createCast(mOptions) {
  const _create = (sourceType, targetType, options = {}) => {
    const { functionName, argumentTypes, inout = false, as } = options;
    let conversion = "";
    if (functionName) {
      const args = argumentTypes || [sourceType];
      conversion = ` WITH FUNCTION ${mOptions.literal(functionName)}(${args.join(", ")})`;
    } else if (inout) {
      conversion = " WITH INOUT";
    } else {
      conversion = " WITHOUT FUNCTION";
    }
    const implicit = as ? ` AS ${as}` : "";
    return `CREATE CAST (${sourceType} AS ${targetType})${conversion}${implicit};`;
  };
  _create.reverse = dropCast(mOptions);
  return _create;
}

// src/utils/decamelize.ts
var REPLACEMENT = "$1_$2";
function decamelize(text) {
  if (text.length < 2) {
    return text.toLowerCase();
  }
  const decamelized = text.replace(
    new RegExp("([\\p{Lowercase_Letter}\\d])(\\p{Uppercase_Letter})", "gu"),
    REPLACEMENT
  );
  return decamelized.replace(
    new RegExp("(\\p{Uppercase_Letter})(\\p{Uppercase_Letter}\\p{Lowercase_Letter}+)", "gu"),
    REPLACEMENT
  ).toLowerCase();
}

// src/utils/identity.ts
function identity(v) {
  return v;
}

// src/utils/quote.ts
function quote(str) {
  return `"${str}"`;
}

// src/utils/createSchemalize.ts
function createSchemalize(options) {
  const { shouldDecamelize, shouldQuote } = options;
  const transform = [
    shouldDecamelize ? decamelize : identity,
    shouldQuote ? quote : identity
  ].reduce((acc, fn) => fn === identity ? acc : (str) => acc(fn(str)));
  return (value) => {
    if (typeof value === "object") {
      const { schema, name } = value;
      return (schema ? `${transform(schema)}.` : "") + transform(name);
    }
    return transform(value);
  };
}

// src/utils/createTransformer.ts
function createTransformer(literal) {
  return (statement, mapping = {}) => Object.keys(mapping).reduce((str, param) => {
    const val = mapping?.[param];
    return str.replace(
      new RegExp(`{${param}}`, "g"),
      val === void 0 ? "" : typeof val === "string" || typeof val === "object" && val !== null && "name" in val ? literal(val) : String(escapeValue(val)).replace(/\$/g, "$$$$")
    );
  }, statement);
}

// src/utils/escapeValue.ts
function escapeValue(val) {
  if (val === null) {
    return "NULL";
  }
  if (typeof val === "boolean") {
    return val.toString();
  }
  if (typeof val === "string") {
    let dollars;
    const ids = new StringIdGenerator();
    let index;
    do {
      index = ids.next();
      dollars = `$pg${index}$`;
    } while (val.includes(dollars));
    return `${dollars}${val}${dollars}`;
  }
  if (typeof val === "number") {
    return val;
  }
  if (Array.isArray(val)) {
    const arrayStr = val.map(escapeValue).join(",").replace(/ARRAY/g, "");
    return `ARRAY[${arrayStr}]`;
  }
  if (isPgLiteral(val)) {
    return val.value;
  }
  return "";
}

// src/utils/formatLines.ts
function formatLines(lines, replace = "  ", separator = ",") {
  return lines.map((line) => line.replace(/(?:\r\n|\r|\n)+/g, " ")).join(`${separator}
`).replace(/^/gm, replace);
}

// src/utils/formatParams.ts
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

// src/utils/toArray.ts
function toArray(item) {
  return Array.isArray(item) ? [...item] : [item];
}

// src/utils/formatPartitionColumns.ts
function formatPartitionColumn(column, literal) {
  if (typeof column === "string") {
    return literal(column);
  }
  let formatted = literal(column.name);
  if (column.collate) {
    formatted += ` COLLATE ${column.collate}`;
  }
  if (column.opclass) {
    formatted += ` ${column.opclass}`;
  }
  return formatted;
}
function formatPartitionColumns(partition, literal) {
  const columns = toArray(partition.columns);
  return columns.map((col) => formatPartitionColumn(col, literal)).join(", ");
}

// src/utils/getMigrationTableSchema.ts
function getMigrationTableSchema(options) {
  return options.migrationsSchema === void 0 ? getSchemas(options.schema)[0] : options.migrationsSchema;
}

// src/utils/getSchemas.ts
function getSchemas(schema) {
  const schemas = toArray(schema).filter(
    (s) => typeof s === "string" && s.length > 0
  );
  return schemas.length > 0 ? schemas : ["public"];
}

// src/utils/intersection.ts
function intersection(list1, list2) {
  return list1.filter((element) => list2.includes(element));
}

// src/utils/makeComment.ts
function makeComment(object, name, text = null) {
  const literal = escapeValue(text);
  return `COMMENT ON ${object} ${name} IS ${literal};`;
}

// src/utils/PgLiteral.ts
var PgLiteral = class _PgLiteral {
  /**
   * Creates a new `PgLiteral` instance.
   *
   * @param str The string value.
   * @returns The new `PgLiteral` instance.
   */
  static create(str) {
    return new _PgLiteral(str);
  }
  /**
   * Indicates that this object is a `PgLiteral`.
   */
  literal = true;
  /**
   * Value of the literal.
   */
  value;
  /**
   * Creates a new `PgLiteral` instance.
   *
   * @param value The string value.
   */
  constructor(value) {
    this.value = value;
  }
  /**
   * Returns the string value.
   *
   * @returns The string value.
   */
  toString() {
    return this.value;
  }
};
function isPgLiteral(val) {
  return val instanceof PgLiteral || typeof val === "object" && val !== null && "literal" in val && val.literal === true;
}

// src/utils/StringIdGenerator.ts
var StringIdGenerator = class {
  chars;
  ids = [0];
  constructor(chars = "abcdefghijklmnopqrstuvwxyz") {
    this.chars = chars;
  }
  next() {
    const idsChars = this.ids.map((id) => this.chars[id]);
    this.increment();
    return idsChars.join("");
  }
  increment() {
    for (let i = this.ids.length - 1; i >= 0; i -= 1) {
      this.ids[i] += 1;
      if (this.ids[i] < this.chars.length) {
        return;
      }
      this.ids[i] = 0;
    }
    this.ids.unshift(0);
  }
};

// src/utils/types.ts
var TYPE_ADAPTERS = Object.freeze({
  int: "integer",
  string: "text",
  float: "real",
  double: "double precision",
  datetime: "timestamp",
  bool: "boolean"
});
var DEFAULT_TYPE_SHORTHANDS = Object.freeze({
  id: { type: "serial", primaryKey: true }
  // convenience type for serial primary keys
});
function applyTypeAdapters(type) {
  return type in TYPE_ADAPTERS ? TYPE_ADAPTERS[type] : type;
}
function toType(type) {
  return typeof type === "string" ? { type } : type;
}
function removeType({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type,
  ...rest
}) {
  return rest;
}
function applyType(type, extendingTypeShorthands = {}) {
  const typeShorthands = {
    ...DEFAULT_TYPE_SHORTHANDS,
    ...extendingTypeShorthands
  };
  const options = toType(type);
  let ext = null;
  const types = [options.type];
  while (typeShorthands[types[types.length - 1]]) {
    ext = {
      ...toType(typeShorthands[types[types.length - 1]]),
      ...ext === null ? {} : removeType(ext)
    };
    if (types.includes(ext.type)) {
      throw new Error(
        `Shorthands contain cyclic dependency: ${types.join(", ")}, ${ext.type}`
      );
    } else {
      types.push(ext.type);
    }
  }
  return {
    ...ext,
    ...options,
    type: applyTypeAdapters(ext?.type ?? options.type)
  };
}

// src/operations/domains/alterDomain.ts
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

// src/operations/domains/dropDomain.ts
function dropDomain(mOptions) {
  const _drop = (domainName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const domainNameStr = mOptions.literal(domainName);
    return `DROP DOMAIN${ifExistsStr} ${domainNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/domains/createDomain.ts
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

// src/operations/domains/renameDomain.ts
function renameDomain(mOptions) {
  const _rename = (domainName, newDomainName) => {
    const domainNameStr = mOptions.literal(domainName);
    const newDomainNameStr = mOptions.literal(newDomainName);
    return `ALTER DOMAIN ${domainNameStr} RENAME TO ${newDomainNameStr};`;
  };
  _rename.reverse = (domainName, newDomainName) => _rename(newDomainName, domainName);
  return _rename;
}

// src/operations/extensions/dropExtension.ts
function dropExtension(mOptions) {
  const _drop = (_extensions, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const extensions = toArray(_extensions);
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return extensions.map((extension) => {
      const extensionStr = mOptions.literal(extension);
      return `DROP EXTENSION${ifExistsStr} ${extensionStr}${cascadeStr};`;
    });
  };
  return _drop;
}

// src/operations/extensions/createExtension.ts
function createExtension(mOptions) {
  const _create = (_extensions, options = {}) => {
    const { ifNotExists = false, schema } = options;
    const extensions = toArray(_extensions);
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const schemaStr = schema ? ` SCHEMA ${mOptions.literal(schema)}` : "";
    return extensions.map((extension) => {
      const extensionStr = mOptions.literal(extension);
      return `CREATE EXTENSION${ifNotExistsStr} ${extensionStr}${schemaStr};`;
    });
  };
  _create.reverse = dropExtension(mOptions);
  return _create;
}

// src/operations/functions/dropFunction.ts
function dropFunction(mOptions) {
  const _drop = (functionName, functionParams = [], options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const paramsStr = formatParams(functionParams, mOptions);
    const functionNameStr = mOptions.literal(functionName);
    return `DROP FUNCTION${ifExistsStr} ${functionNameStr}${paramsStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/functions/createFunction.ts
function createFunction(mOptions) {
  const _create = (functionName, functionParams = [], functionOptions, definition) => {
    const {
      replace = false,
      returns = "void",
      language,
      window = false,
      behavior = "VOLATILE",
      security = "INVOKER",
      onNull = false,
      parallel,
      set
    } = functionOptions;
    const options = [];
    if (behavior) {
      options.push(behavior);
    }
    if (language) {
      options.push(`LANGUAGE ${language}`);
    } else {
      throw new Error(
        `Language for function ${functionName} have to be specified`
      );
    }
    if (security !== "INVOKER") {
      options.push(`SECURITY ${security}`);
    }
    if (window) {
      options.push("WINDOW");
    }
    if (onNull) {
      options.push("RETURNS NULL ON NULL INPUT");
    }
    if (parallel) {
      options.push(`PARALLEL ${parallel}`);
    }
    if (set) {
      for (const { configurationParameter, value } of set) {
        if (value === "FROM CURRENT") {
          options.push(
            `SET ${mOptions.literal(configurationParameter)} FROM CURRENT`
          );
        } else {
          options.push(
            `SET ${mOptions.literal(configurationParameter)} TO ${value}`
          );
        }
      }
    }
    const replaceStr = replace ? " OR REPLACE" : "";
    const paramsStr = formatParams(functionParams, mOptions);
    const functionNameStr = mOptions.literal(functionName);
    return `CREATE${replaceStr} FUNCTION ${functionNameStr}${paramsStr}
  RETURNS ${returns}
  AS ${escapeValue(definition)}
  ${options.join("\n  ")};`;
  };
  _create.reverse = dropFunction(mOptions);
  return _create;
}

// src/operations/functions/renameFunction.ts
function renameFunction(mOptions) {
  const _rename = (oldFunctionName, functionParams = [], newFunctionName) => {
    const paramsStr = formatParams(functionParams, mOptions);
    const oldFunctionNameStr = mOptions.literal(oldFunctionName);
    const newFunctionNameStr = mOptions.literal(newFunctionName);
    return `ALTER FUNCTION ${oldFunctionNameStr}${paramsStr} RENAME TO ${newFunctionNameStr};`;
  };
  _rename.reverse = (oldFunctionName, functionParams, newFunctionName) => _rename(newFunctionName, functionParams, oldFunctionName);
  return _rename;
}

// src/operations/grants/shared.ts
function isAllTablesOptions(options) {
  return "schema" in options;
}
function asRolesStr(roles, mOptions) {
  return toArray(roles).map((role) => role === "PUBLIC" ? role : mOptions.literal(role)).join(", ");
}
function asTablesStr(options, mOptions) {
  return isAllTablesOptions(options) ? `ALL TABLES IN SCHEMA ${mOptions.literal(options.schema)}` : toArray(options.tables).map(mOptions.literal).join(", ");
}

// src/operations/grants/revokeOnSchemas.ts
function revokeOnSchemas(mOptions) {
  const _revokeOnSchemas = (options) => {
    const {
      privileges,
      schemas,
      roles,
      onlyGrantOption = false,
      cascade = false
    } = options;
    const rolesStr = asRolesStr(roles, mOptions);
    const schemasStr = toArray(schemas).map(mOptions.literal).join(", ");
    const privilegesStr = toArray(privileges).map(String).join(", ");
    const onlyGrantOptionStr = onlyGrantOption ? " GRANT OPTION FOR" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `REVOKE${onlyGrantOptionStr} ${privilegesStr} ON SCHEMA ${schemasStr} FROM ${rolesStr}${cascadeStr};`;
  };
  return _revokeOnSchemas;
}

// src/operations/grants/grantOnSchemas.ts
function grantOnSchemas(mOptions) {
  const _grantOnSchemas = (options) => {
    const { privileges, schemas, roles, withGrantOption = false } = options;
    const rolesStr = asRolesStr(roles, mOptions);
    const schemasStr = toArray(schemas).map(mOptions.literal).join(", ");
    const privilegesStr = toArray(privileges).map(String).join(", ");
    const withGrantOptionStr = withGrantOption ? " WITH GRANT OPTION" : "";
    return `GRANT ${privilegesStr} ON SCHEMA ${schemasStr} TO ${rolesStr}${withGrantOptionStr};`;
  };
  _grantOnSchemas.reverse = revokeOnSchemas(mOptions);
  return _grantOnSchemas;
}

// src/operations/grants/revokeOnTables.ts
function revokeOnTables(mOptions) {
  const _revokeOnTables = (options) => {
    const {
      privileges,
      roles,
      onlyGrantOption = false,
      cascade = false
    } = options;
    const rolesStr = asRolesStr(roles, mOptions);
    const privilegesStr = toArray(privileges).map(String).join(", ");
    const tablesStr = asTablesStr(options, mOptions);
    const onlyGrantOptionStr = onlyGrantOption ? " GRANT OPTION FOR" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `REVOKE${onlyGrantOptionStr} ${privilegesStr} ON ${tablesStr} FROM ${rolesStr}${cascadeStr};`;
  };
  return _revokeOnTables;
}

// src/operations/grants/grantOnTables.ts
function grantOnTables(mOptions) {
  const _grantOnTables = (options) => {
    const { privileges, roles, withGrantOption = false } = options;
    const rolesStr = asRolesStr(roles, mOptions);
    const privilegesStr = toArray(privileges).map(String).join(", ");
    const tablesStr = asTablesStr(options, mOptions);
    const withGrantOptionStr = withGrantOption ? " WITH GRANT OPTION" : "";
    return `GRANT ${privilegesStr} ON ${tablesStr} TO ${rolesStr}${withGrantOptionStr};`;
  };
  _grantOnTables.reverse = revokeOnTables(mOptions);
  return _grantOnTables;
}

// src/operations/grants/revokeRoles.ts
function revokeRoles(mOptions) {
  const _revokeRoles = (roles, rolesFrom, options = {}) => {
    const { onlyAdminOption = false, cascade = false } = options;
    const rolesStr = toArray(roles).map(mOptions.literal).join(", ");
    const rolesToStr = toArray(rolesFrom).map(mOptions.literal).join(", ");
    const onlyAdminOptionStr = onlyAdminOption ? " ADMIN OPTION FOR" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `REVOKE${onlyAdminOptionStr} ${rolesStr} FROM ${rolesToStr}${cascadeStr};`;
  };
  return _revokeRoles;
}

// src/operations/grants/grantRoles.ts
function grantRoles(mOptions) {
  const _grantRoles = (rolesFrom, rolesTo, options = {}) => {
    const { withAdminOption = false } = options;
    const rolesFromStr = toArray(rolesFrom).map(mOptions.literal).join(", ");
    const rolesToStr = toArray(rolesTo).map(mOptions.literal).join(", ");
    const withAdminOptionStr = withAdminOption ? " WITH ADMIN OPTION" : "";
    return `GRANT ${rolesFromStr} TO ${rolesToStr}${withAdminOptionStr};`;
  };
  _grantRoles.reverse = revokeRoles(mOptions);
  return _grantRoles;
}

// src/operations/indexes/shared.ts
function generateIndexName(table, columns, options, schemalize) {
  if (options.name) {
    return typeof table === "object" ? { schema: table.schema, name: options.name } : options.name;
  }
  const cols = columns.map((col) => schemalize(typeof col === "string" ? col : col.name)).join("_");
  const uniq = "unique" in options && options.unique ? "_unique" : "";
  return typeof table === "object" ? {
    schema: table.schema,
    name: `${table.name}_${cols}${uniq}_index`
  } : `${table}_${cols}${uniq}_index`;
}
function generateColumnString(column, mOptions) {
  const name = mOptions.schemalize(column);
  const isSpecial = /[ ().]/.test(name);
  return isSpecial ? name : mOptions.literal(name);
}
function generateColumnsString(columns, mOptions) {
  return columns.map(
    (column) => typeof column === "string" ? generateColumnString(column, mOptions) : [
      generateColumnString(column.name, mOptions),
      column.opclass ? mOptions.literal(column.opclass) : void 0,
      column.sort
    ].filter((s) => typeof s === "string" && s !== "").join(" ")
  ).join(", ");
}

// src/operations/indexes/dropIndex.ts
function dropIndex(mOptions) {
  const _drop = (tableName, rawColumns, options = {}) => {
    const { concurrently = false, ifExists = false, cascade = false } = options;
    const columns = toArray(rawColumns);
    const concurrentlyStr = concurrently ? " CONCURRENTLY" : "";
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const indexName = generateIndexName(
      tableName,
      columns,
      options,
      mOptions.schemalize
    );
    const cascadeStr = cascade ? " CASCADE" : "";
    const indexNameStr = mOptions.literal(indexName);
    return `DROP INDEX${concurrentlyStr}${ifExistsStr} ${indexNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/indexes/createIndex.ts
function createIndex(mOptions) {
  const _create = (tableName, rawColumns, options = {}) => {
    const {
      unique = false,
      concurrently = false,
      ifNotExists = false,
      method,
      where,
      include
    } = options;
    const columns = toArray(rawColumns);
    const indexName = generateIndexName(
      typeof tableName === "object" ? tableName.name : tableName,
      columns,
      options,
      mOptions.schemalize
    );
    const columnsString = generateColumnsString(columns, mOptions);
    const uniqueStr = unique ? " UNIQUE" : "";
    const concurrentlyStr = concurrently ? " CONCURRENTLY" : "";
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const methodStr = method ? ` USING ${method}` : "";
    const whereStr = where ? ` WHERE ${where}` : "";
    const includeStr = include ? ` INCLUDE (${toArray(include).map(mOptions.literal).join(", ")})` : "";
    const indexNameStr = mOptions.literal(indexName);
    const tableNameStr = mOptions.literal(tableName);
    return `CREATE${uniqueStr} INDEX${concurrentlyStr}${ifNotExistsStr} ${indexNameStr} ON ${tableNameStr}${methodStr} (${columnsString})${includeStr}${whereStr};`;
  };
  _create.reverse = dropIndex(mOptions);
  return _create;
}

// src/operations/materializedViews/shared.ts
function dataClause(data) {
  return data === void 0 ? "" : ` WITH${data ? "" : " NO"} DATA`;
}
function storageParameterStr(storageParameters) {
  return (key) => {
    const value = storageParameters[key] === true ? "" : ` = ${storageParameters[key]}`;
    return `${key}${value}`;
  };
}

// src/operations/materializedViews/alterMaterializedView.ts
function alterMaterializedView(mOptions) {
  const _alter = (viewName, options) => {
    const { cluster, extension, storageParameters = {} } = options;
    const clauses = [];
    if (cluster !== void 0) {
      if (cluster) {
        clauses.push(`CLUSTER ON ${mOptions.literal(cluster)}`);
      } else {
        clauses.push("SET WITHOUT CLUSTER");
      }
    }
    if (extension) {
      clauses.push(`DEPENDS ON EXTENSION ${mOptions.literal(extension)}`);
    }
    const withOptions = Object.keys(storageParameters).filter((key) => storageParameters[key] !== null).map(storageParameterStr(storageParameters)).join(", ");
    if (withOptions) {
      clauses.push(`SET (${withOptions})`);
    }
    const resetOptions = Object.keys(storageParameters).filter((key) => storageParameters[key] === null).join(", ");
    if (resetOptions) {
      clauses.push(`RESET (${resetOptions})`);
    }
    const clausesStr = formatLines(clauses);
    const viewNameStr = mOptions.literal(viewName);
    return `ALTER MATERIALIZED VIEW ${viewNameStr}
${clausesStr};`;
  };
  return _alter;
}

// src/operations/materializedViews/dropMaterializedView.ts
function dropMaterializedView(mOptions) {
  const _drop = (viewName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const viewNameStr = mOptions.literal(viewName);
    return `DROP MATERIALIZED VIEW${ifExistsStr} ${viewNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/materializedViews/createMaterializedView.ts
function createMaterializedView(mOptions) {
  const _create = (viewName, options, definition) => {
    const {
      ifNotExists = false,
      columns = [],
      tablespace,
      storageParameters = {},
      data
    } = options;
    const columnNames = toArray(columns).map(mOptions.literal).join(", ");
    const withOptions = Object.keys(storageParameters).map(storageParameterStr(storageParameters)).join(", ");
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const columnsStr = columnNames ? `(${columnNames})` : "";
    const withOptionsStr = withOptions ? ` WITH (${withOptions})` : "";
    const tablespaceStr = tablespace ? ` TABLESPACE ${mOptions.literal(tablespace)}` : "";
    const dataStr = dataClause(data);
    const viewNameStr = mOptions.literal(viewName);
    return `CREATE MATERIALIZED VIEW${ifNotExistsStr} ${viewNameStr}${columnsStr}${withOptionsStr}${tablespaceStr} AS ${definition}${dataStr};`;
  };
  _create.reverse = dropMaterializedView(mOptions);
  return _create;
}

// src/operations/materializedViews/refreshMaterializedView.ts
function refreshMaterializedView(mOptions) {
  const _refresh = (viewName, options = {}) => {
    const { concurrently = false, data } = options;
    const concurrentlyStr = concurrently ? " CONCURRENTLY" : "";
    const dataStr = dataClause(data);
    const viewNameStr = mOptions.literal(viewName);
    return `REFRESH MATERIALIZED VIEW${concurrentlyStr} ${viewNameStr}${dataStr};`;
  };
  _refresh.reverse = _refresh;
  return _refresh;
}

// src/operations/materializedViews/renameMaterializedView.ts
function renameMaterializedView(mOptions) {
  const _rename = (viewName, newViewName) => {
    const viewNameStr = mOptions.literal(viewName);
    const newViewNameStr = mOptions.literal(newViewName);
    return `ALTER MATERIALIZED VIEW ${viewNameStr} RENAME TO ${newViewNameStr};`;
  };
  _rename.reverse = (viewName, newViewName) => _rename(newViewName, viewName);
  return _rename;
}

// src/operations/materializedViews/renameMaterializedViewColumn.ts
function renameMaterializedViewColumn(mOptions) {
  const _rename = (viewName, columnName, newColumnName) => {
    const viewNameStr = mOptions.literal(viewName);
    const columnNameStr = mOptions.literal(columnName);
    const newColumnNameStr = mOptions.literal(newColumnName);
    return `ALTER MATERIALIZED VIEW ${viewNameStr} RENAME COLUMN ${columnNameStr} TO ${newColumnNameStr};`;
  };
  _rename.reverse = (viewName, columnName, newColumnName) => _rename(viewName, newColumnName, columnName);
  return _rename;
}

// src/operations/operators/shared.ts
function operatorMap(mOptions) {
  return ({ type, number, name, params = [] }) => {
    const nameStr = mOptions.literal(name);
    if (String(type).toLowerCase() === "operator") {
      if (params.length > 2) {
        throw new Error("Operator can't have more than 2 parameters");
      }
      const paramsStr = params.length > 0 ? formatParams(params, mOptions) : "";
      return `OPERATOR ${number} ${nameStr}${paramsStr}`;
    }
    if (String(type).toLowerCase() === "function") {
      const paramsStr = formatParams(params, mOptions);
      return `FUNCTION ${number} ${nameStr}${paramsStr}`;
    }
    throw new Error('Operator "type" must be either "function" or "operator"');
  };
}

// src/operations/operators/removeFromOperatorFamily.ts
var removeFromOperatorFamily = (mOptions) => {
  const method = (operatorFamilyName, indexMethod, operatorList) => {
    const operatorFamilyNameStr = mOptions.literal(operatorFamilyName);
    const operatorListStr = operatorList.map(operatorMap(mOptions)).join(",\n  ");
    return `ALTER OPERATOR FAMILY ${operatorFamilyNameStr} USING ${indexMethod} DROP
  ${operatorListStr};`;
  };
  return method;
};

// src/operations/operators/addToOperatorFamily.ts
var addToOperatorFamily = (mOptions) => {
  const method = (operatorFamilyName, indexMethod, operatorList) => {
    const operatorFamilyNameStr = mOptions.literal(operatorFamilyName);
    const operatorListStr = operatorList.map(operatorMap(mOptions)).join(",\n  ");
    return `ALTER OPERATOR FAMILY ${operatorFamilyNameStr} USING ${indexMethod} ADD
  ${operatorListStr};`;
  };
  method.reverse = removeFromOperatorFamily(mOptions);
  return method;
};

// src/operations/operators/dropOperator.ts
function dropOperator(mOptions) {
  const _drop = (operatorName, options = {}) => {
    const {
      left = "none",
      right = "none",
      ifExists = false,
      cascade = false
    } = options;
    const operatorNameStr = mOptions.schemalize(operatorName);
    const leftStr = mOptions.literal(left);
    const rightStr = mOptions.literal(right);
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `DROP OPERATOR${ifExistsStr} ${operatorNameStr}(${leftStr}, ${rightStr})${cascadeStr};`;
  };
  return _drop;
}

// src/operations/operators/createOperator.ts
function createOperator(mOptions) {
  const _create = (operatorName, options) => {
    const {
      procedure,
      left,
      right,
      commutator,
      negator,
      restrict,
      join: join2,
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
    if (join2) {
      defs.push(`JOIN = ${mOptions.literal(join2)}`);
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

// src/operations/operators/dropOperatorClass.ts
function dropOperatorClass(mOptions) {
  const _drop = (operatorClassName, indexMethod, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const operatorClassNameStr = mOptions.literal(operatorClassName);
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `DROP OPERATOR CLASS${ifExistsStr} ${operatorClassNameStr} USING ${indexMethod}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/operators/createOperatorClass.ts
function createOperatorClass(mOptions) {
  const _create = (operatorClassName, type, indexMethod, operatorList, options) => {
    const { default: isDefault, family } = options;
    const operatorClassNameStr = mOptions.literal(operatorClassName);
    const defaultStr = isDefault ? " DEFAULT" : "";
    const typeStr = mOptions.literal(applyType(type).type);
    const indexMethodStr = mOptions.literal(indexMethod);
    const familyStr = family ? ` FAMILY ${family}` : "";
    const operatorListStr = operatorList.map(operatorMap(mOptions)).join(",\n  ");
    return `CREATE OPERATOR CLASS ${operatorClassNameStr}${defaultStr} FOR TYPE ${typeStr} USING ${indexMethodStr}${familyStr} AS
  ${operatorListStr};`;
  };
  _create.reverse = (operatorClassName, type, indexMethod, operatorList, options) => dropOperatorClass(mOptions)(operatorClassName, indexMethod, options);
  return _create;
}

// src/operations/operators/dropOperatorFamily.ts
function dropOperatorFamily(mOptions) {
  const _drop = (operatorFamilyName, indexMethod, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const operatorFamilyNameStr = mOptions.literal(operatorFamilyName);
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    return `DROP OPERATOR FAMILY${ifExistsStr} ${operatorFamilyNameStr} USING ${indexMethod}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/operators/createOperatorFamily.ts
function createOperatorFamily(mOptions) {
  const _create = (operatorFamilyName, indexMethod) => {
    const operatorFamilyNameStr = mOptions.literal(operatorFamilyName);
    return `CREATE OPERATOR FAMILY ${operatorFamilyNameStr} USING ${indexMethod};`;
  };
  _create.reverse = dropOperatorFamily(mOptions);
  return _create;
}

// src/operations/operators/renameOperatorClass.ts
function renameOperatorClass(mOptions) {
  const _rename = (oldOperatorClassName, indexMethod, newOperatorClassName) => {
    const oldOperatorClassNameStr = mOptions.literal(oldOperatorClassName);
    const newOperatorClassNameStr = mOptions.literal(newOperatorClassName);
    return `ALTER OPERATOR CLASS ${oldOperatorClassNameStr} USING ${indexMethod} RENAME TO ${newOperatorClassNameStr};`;
  };
  _rename.reverse = (oldOperatorClassName, indexMethod, newOperatorClassName) => _rename(newOperatorClassName, indexMethod, oldOperatorClassName);
  return _rename;
}

// src/operations/operators/renameOperatorFamily.ts
function renameOperatorFamily(mOptions) {
  const _rename = (oldOperatorFamilyName, indexMethod, newOperatorFamilyName) => {
    const oldOperatorFamilyNameStr = mOptions.literal(oldOperatorFamilyName);
    const newOperatorFamilyNameStr = mOptions.literal(newOperatorFamilyName);
    return `ALTER OPERATOR FAMILY ${oldOperatorFamilyNameStr} USING ${indexMethod} RENAME TO ${newOperatorFamilyNameStr};`;
  };
  _rename.reverse = (oldOperatorFamilyName, indexMethod, newOperatorFamilyName) => _rename(newOperatorFamilyName, indexMethod, oldOperatorFamilyName);
  return _rename;
}

// src/operations/policies/shared.ts
function makeClauses({ role, using, check }) {
  const roles = toArray(role).join(", ");
  const clauses = [];
  if (roles) {
    clauses.push(`TO ${roles}`);
  }
  if (using) {
    clauses.push(`USING (${using})`);
  }
  if (check) {
    clauses.push(`WITH CHECK (${check})`);
  }
  return clauses;
}

// src/operations/policies/alterPolicy.ts
function alterPolicy(mOptions) {
  const _alter = (tableName, policyName, options = {}) => {
    const clausesStr = makeClauses(options).join(" ");
    const policyNameStr = mOptions.literal(policyName);
    const tableNameStr = mOptions.literal(tableName);
    return `ALTER POLICY ${policyNameStr} ON ${tableNameStr} ${clausesStr};`;
  };
  return _alter;
}

// src/operations/policies/dropPolicy.ts
function dropPolicy(mOptions) {
  const _drop = (tableName, policyName, options = {}) => {
    const { ifExists = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const policyNameStr = mOptions.literal(policyName);
    const tableNameStr = mOptions.literal(tableName);
    return `DROP POLICY${ifExistsStr} ${policyNameStr} ON ${tableNameStr};`;
  };
  return _drop;
}

// src/operations/policies/createPolicy.ts
function createPolicy(mOptions) {
  const _create = (tableName, policyName, options = {}) => {
    const { role = "PUBLIC", command = "ALL" } = options;
    const createOptions = {
      ...options,
      role
    };
    const clauses = [`FOR ${command}`, ...makeClauses(createOptions)];
    const clausesStr = clauses.join(" ");
    const policyNameStr = mOptions.literal(policyName);
    const tableNameStr = mOptions.literal(tableName);
    return `CREATE POLICY ${policyNameStr} ON ${tableNameStr} ${clausesStr};`;
  };
  _create.reverse = dropPolicy(mOptions);
  return _create;
}

// src/operations/policies/renamePolicy.ts
function renamePolicy(mOptions) {
  const _rename = (tableName, policyName, newPolicyName) => {
    const policyNameStr = mOptions.literal(policyName);
    const newPolicyNameStr = mOptions.literal(newPolicyName);
    const tableNameStr = mOptions.literal(tableName);
    return `ALTER POLICY ${policyNameStr} ON ${tableNameStr} RENAME TO ${newPolicyNameStr};`;
  };
  _rename.reverse = (tableName, policyName, newPolicyName) => _rename(tableName, newPolicyName, policyName);
  return _rename;
}

// src/operations/roles/shared.ts
function formatRoleOptions(roleOptions = {}) {
  const options = [];
  if (roleOptions.superuser !== void 0) {
    options.push(roleOptions.superuser ? "SUPERUSER" : "NOSUPERUSER");
  }
  if (roleOptions.createdb !== void 0) {
    options.push(roleOptions.createdb ? "CREATEDB" : "NOCREATEDB");
  }
  if (roleOptions.createrole !== void 0) {
    options.push(roleOptions.createrole ? "CREATEROLE" : "NOCREATEROLE");
  }
  if (roleOptions.inherit !== void 0) {
    options.push(roleOptions.inherit ? "INHERIT" : "NOINHERIT");
  }
  if (roleOptions.login !== void 0) {
    options.push(roleOptions.login ? "LOGIN" : "NOLOGIN");
  }
  if (roleOptions.replication !== void 0) {
    options.push(roleOptions.replication ? "REPLICATION" : "NOREPLICATION");
  }
  if (roleOptions.bypassrls !== void 0) {
    options.push(roleOptions.bypassrls ? "BYPASSRLS" : "NOBYPASSRLS");
  }
  if (roleOptions.limit) {
    options.push(`CONNECTION LIMIT ${Number(roleOptions.limit)}`);
  }
  if (roleOptions.password !== void 0) {
    const encrypted = roleOptions.encrypted === false ? "UNENCRYPTED" : "ENCRYPTED";
    options.push(`${encrypted} PASSWORD ${escapeValue(roleOptions.password)}`);
  }
  if (roleOptions.valid !== void 0) {
    const valid = roleOptions.valid ? escapeValue(roleOptions.valid) : "'infinity'";
    options.push(`VALID UNTIL ${valid}`);
  }
  if (roleOptions.inRole) {
    const inRole = toArray(roleOptions.inRole).join(", ");
    options.push(`IN ROLE ${inRole}`);
  }
  if (roleOptions.role) {
    const role = toArray(roleOptions.role).join(", ");
    options.push(`ROLE ${role}`);
  }
  if (roleOptions.admin) {
    const admin = toArray(roleOptions.admin).join(", ");
    options.push(`ADMIN ${admin}`);
  }
  return options.join(" ");
}

// src/operations/roles/alterRole.ts
function alterRole(mOptions) {
  const _alter = (roleName, roleOptions = {}) => {
    const options = formatRoleOptions(roleOptions);
    return options ? `ALTER ROLE ${mOptions.literal(roleName)} WITH ${options};` : "";
  };
  return _alter;
}

// src/operations/roles/dropRole.ts
function dropRole(mOptions) {
  const _drop = (roleName, options = {}) => {
    const { ifExists = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const roleNameStr = mOptions.literal(roleName);
    return `DROP ROLE${ifExistsStr} ${roleNameStr};`;
  };
  return _drop;
}

// src/operations/roles/createRole.ts
function createRole(mOptions) {
  const _create = (roleName, roleOptions = {}) => {
    const options = formatRoleOptions({
      ...roleOptions,
      superuser: roleOptions.superuser || false,
      createdb: roleOptions.createdb || false,
      createrole: roleOptions.createrole || false,
      inherit: roleOptions.inherit !== false,
      login: roleOptions.login || false,
      replication: roleOptions.replication || false
    });
    const optionsStr = options ? ` WITH ${options}` : "";
    return `CREATE ROLE ${mOptions.literal(roleName)}${optionsStr};`;
  };
  _create.reverse = dropRole(mOptions);
  return _create;
}

// src/operations/roles/renameRole.ts
function renameRole(mOptions) {
  const _rename = (oldRoleName, newRoleName) => {
    const oldRoleNameStr = mOptions.literal(oldRoleName);
    const newRoleNameStr = mOptions.literal(newRoleName);
    return `ALTER ROLE ${oldRoleNameStr} RENAME TO ${newRoleNameStr};`;
  };
  _rename.reverse = (oldRoleName, newRoleName) => _rename(newRoleName, oldRoleName);
  return _rename;
}

// src/operations/schemas/dropSchema.ts
function dropSchema(mOptions) {
  const _drop = (schemaName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const schemaNameStr = mOptions.literal(schemaName);
    return `DROP SCHEMA${ifExistsStr} ${schemaNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/schemas/createSchema.ts
function createSchema(mOptions) {
  const _create = (schemaName, options = {}) => {
    const { ifNotExists = false, authorization } = options;
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const schemaNameStr = mOptions.literal(schemaName);
    const authorizationStr = authorization ? ` AUTHORIZATION ${authorization}` : "";
    return `CREATE SCHEMA${ifNotExistsStr} ${schemaNameStr}${authorizationStr};`;
  };
  _create.reverse = dropSchema(mOptions);
  return _create;
}

// src/operations/schemas/renameSchema.ts
function renameSchema(mOptions) {
  const _rename = (schemaName, newSchemaName) => {
    const schemaNameStr = mOptions.literal(schemaName);
    const newSchemaNameStr = mOptions.literal(newSchemaName);
    return `ALTER SCHEMA ${schemaNameStr} RENAME TO ${newSchemaNameStr};`;
  };
  _rename.reverse = (schemaName, newSchemaName) => _rename(newSchemaName, schemaName);
  return _rename;
}

// src/operations/sequences/shared.ts
function parseSequenceOptions(typeShorthands, options) {
  const { type, increment, minvalue, maxvalue, start, cache, cycle, owner } = options;
  const clauses = [];
  if (type) {
    clauses.push(`AS ${applyType(type, typeShorthands).type}`);
  }
  if (increment) {
    clauses.push(`INCREMENT BY ${increment}`);
  }
  if (minvalue) {
    clauses.push(`MINVALUE ${minvalue}`);
  } else if (minvalue === null || minvalue === false) {
    clauses.push("NO MINVALUE");
  }
  if (maxvalue) {
    clauses.push(`MAXVALUE ${maxvalue}`);
  } else if (maxvalue === null || maxvalue === false) {
    clauses.push("NO MAXVALUE");
  }
  if (start) {
    clauses.push(`START WITH ${start}`);
  }
  if (cache) {
    clauses.push(`CACHE ${cache}`);
  }
  if (cycle) {
    clauses.push("CYCLE");
  } else if (cycle === false) {
    clauses.push("NO CYCLE");
  }
  if (owner) {
    clauses.push(`OWNED BY ${owner}`);
  } else if (owner === null || owner === false) {
    clauses.push("OWNED BY NONE");
  }
  return clauses;
}

// src/operations/sequences/alterSequence.ts
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

// src/operations/sequences/dropSequence.ts
function dropSequence(mOptions) {
  const _drop = (sequenceName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const sequenceNameStr = mOptions.literal(sequenceName);
    return `DROP SEQUENCE${ifExistsStr} ${sequenceNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/sequences/createSequence.ts
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

// src/operations/sequences/renameSequence.ts
function renameSequence(mOptions) {
  const _rename = (sequenceName, newSequenceName) => {
    const sequenceNameStr = mOptions.literal(sequenceName);
    const newSequenceNameStr = mOptions.literal(newSequenceName);
    return `ALTER SEQUENCE ${sequenceNameStr} RENAME TO ${newSequenceNameStr};`;
  };
  _rename.reverse = (sequenceName, newSequenceName) => _rename(newSequenceName, sequenceName);
  return _rename;
}

// src/operations/sql.ts
function sql(mOptions) {
  const t = createTransformer(mOptions.literal);
  return (sqlStr, args) => {
    let statement = t(sqlStr, args);
    if (statement.lastIndexOf(";") !== statement.length - 1) {
      statement += ";";
    }
    return statement;
  };
}

// src/operations/tables/dropColumns.ts
function dropColumns(mOptions) {
  const _drop = (tableName, columns, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    if (typeof columns === "string") {
      columns = [columns];
    } else if (!Array.isArray(columns) && typeof columns === "object") {
      columns = Object.keys(columns);
    }
    const ifExistsStr = ifExists ? "IF EXISTS " : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const lines = columns.map(mOptions.literal).map((column) => `DROP ${ifExistsStr}${column}${cascadeStr}`);
    return `ALTER TABLE ${mOptions.literal(tableName)}
${formatLines(lines)};`;
  };
  return _drop;
}

// src/operations/tables/shared.ts
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

// src/operations/tables/addColumns.ts
function addColumns(mOptions) {
  const _add = (tableName, columns, options = {}) => {
    const { ifNotExists = false } = options;
    const { columns: columnLines, comments: columnComments = [] } = parseColumns(tableName, columns, mOptions);
    const ifNotExistsStr = ifNotExists ? "IF NOT EXISTS " : "";
    const columnsStr = formatLines(columnLines, `  ADD ${ifNotExistsStr}`);
    const tableNameStr = mOptions.literal(tableName);
    const alterTableQuery = `ALTER TABLE ${tableNameStr}
${columnsStr};`;
    const columnCommentsStr = columnComments.length > 0 ? `
${columnComments.join("\n")}` : "";
    return `${alterTableQuery}${columnCommentsStr}`;
  };
  _add.reverse = dropColumns(mOptions);
  return _add;
}

// src/operations/tables/dropConstraint.ts
function dropConstraint(mOptions) {
  const _drop = (tableName, constraintName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const tableNameStr = mOptions.literal(tableName);
    const constraintNameStr = mOptions.literal(constraintName);
    return `ALTER TABLE ${tableNameStr} DROP CONSTRAINT${ifExistsStr} ${constraintNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/tables/addConstraint.ts
function addConstraint(mOptions) {
  const _add = (tableName, constraintName, expressionOrOptions) => {
    const { constraints, comments } = typeof expressionOrOptions === "string" ? {
      constraints: [
        `${constraintName ? `CONSTRAINT ${mOptions.literal(constraintName)} ` : ""}${expressionOrOptions}`
      ],
      comments: []
    } : parseConstraints(
      tableName,
      expressionOrOptions,
      constraintName,
      mOptions.literal
    );
    const constraintStr = formatLines(constraints, "  ADD ");
    return [
      `ALTER TABLE ${mOptions.literal(tableName)}
${constraintStr};`,
      ...comments
    ].join("\n");
  };
  _add.reverse = (tableName, constraintName, expressionOrOptions) => {
    if (constraintName === null) {
      throw new Error(
        "Impossible to automatically infer down migration for addConstraint without naming constraint"
      );
    }
    if (typeof expressionOrOptions === "string") {
      throw new Error(
        "Impossible to automatically infer down migration for addConstraint with raw SQL expression"
      );
    }
    return dropConstraint(mOptions)(
      tableName,
      constraintName,
      expressionOrOptions
    );
  };
  return _add;
}

// src/operations/tables/alterColumn.ts
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

// src/operations/tables/alterTable.ts
function alterTable(mOptions) {
  const _alter = (tableName, options) => {
    const { levelSecurity, unlogged } = options;
    const alterDefinition = [];
    if (levelSecurity) {
      alterDefinition.push(`${levelSecurity} ROW LEVEL SECURITY`);
    }
    if (unlogged === true) {
      alterDefinition.push(`SET UNLOGGED`);
    } else if (unlogged === false) {
      alterDefinition.push(`SET LOGGED`);
    }
    return `ALTER TABLE ${mOptions.literal(tableName)}
  ${formatLines(alterDefinition)};`;
  };
  return _alter;
}

// src/operations/tables/dropTable.ts
function dropTable(mOptions) {
  const _drop = (tableName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const tableNameStr = mOptions.literal(tableName);
    return `DROP TABLE${ifExistsStr} ${tableNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/tables/createTable.ts
function createTable(mOptions) {
  const _create = (tableName, columns, options = {}) => {
    const {
      temporary = false,
      ifNotExists = false,
      inherits,
      like,
      constraints: optionsConstraints = {},
      comment,
      partition,
      unlogged = false
    } = options;
    const {
      columns: columnLines,
      constraints: crossColumnConstraints,
      comments: columnComments = []
    } = parseColumns(tableName, columns, mOptions);
    const dupes = intersection(
      Object.keys(optionsConstraints),
      Object.keys(crossColumnConstraints)
    );
    if (dupes.length > 0) {
      const dupesStr = dupes.join(", ");
      throw new Error(
        `There is duplicate constraint definition in table and columns options: ${dupesStr}`
      );
    }
    const constraints = {
      ...optionsConstraints,
      ...crossColumnConstraints
    };
    const { constraints: constraintLines, comments: constraintComments } = parseConstraints(tableName, constraints, "", mOptions.literal);
    const tableDefinition = [
      ...columnLines,
      ...constraintLines,
      ...like ? [parseLike(like, mOptions.literal)] : []
    ];
    if (temporary && unlogged) {
      throw new Error("TEMPORARY and UNLOGGED cannot be used together.");
    }
    const temporaryStr = temporary ? " TEMPORARY" : "";
    const unloggedStr = unlogged ? " UNLOGGED" : "";
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const inheritsStr = inherits ? ` INHERITS (${mOptions.literal(inherits)})` : "";
    const partitionStr = partition ? ` PARTITION BY ${partition.strategy} (${formatPartitionColumns(partition, mOptions.literal)})` : "";
    const tableNameStr = mOptions.literal(tableName);
    const createTableQuery = `CREATE${temporaryStr}${unloggedStr} TABLE${ifNotExistsStr} ${tableNameStr} (
${formatLines(tableDefinition)}
)${inheritsStr}${partitionStr};`;
    const comments = [...columnComments, ...constraintComments];
    if (comment !== void 0) {
      comments.push(makeComment("TABLE", mOptions.literal(tableName), comment));
    }
    return `${createTableQuery}${comments.length > 0 ? `
${comments.join("\n")}` : ""}`;
  };
  _create.reverse = dropTable(mOptions);
  return _create;
}

// src/operations/tables/renameColumn.ts
function renameColumn(mOptions) {
  const _rename = (tableName, columnName, newName) => {
    const tableNameStr = mOptions.literal(tableName);
    const columnNameStr = mOptions.literal(columnName);
    const newNameStr = mOptions.literal(newName);
    return `ALTER TABLE ${tableNameStr} RENAME ${columnNameStr} TO ${newNameStr};`;
  };
  _rename.reverse = (tableName, columnName, newName) => _rename(tableName, newName, columnName);
  return _rename;
}

// src/operations/tables/renameConstraint.ts
function renameConstraint(mOptions) {
  const _rename = (tableName, constraintName, newName) => {
    const tableNameStr = mOptions.literal(tableName);
    const constraintNameStr = mOptions.literal(constraintName);
    const newNameStr = mOptions.literal(newName);
    return `ALTER TABLE ${tableNameStr} RENAME CONSTRAINT ${constraintNameStr} TO ${newNameStr};`;
  };
  _rename.reverse = (tableName, constraintName, newName) => _rename(tableName, newName, constraintName);
  return _rename;
}

// src/operations/tables/renameTable.ts
function renameTable(mOptions) {
  const _rename = (tableName, newName) => {
    const tableNameStr = mOptions.literal(tableName);
    const newNameStr = mOptions.literal(newName);
    return `ALTER TABLE ${tableNameStr} RENAME TO ${newNameStr};`;
  };
  _rename.reverse = (tableName, newName) => _rename(newName, tableName);
  return _rename;
}

// src/operations/triggers/dropTrigger.ts
function dropTrigger(mOptions) {
  const _drop = (tableName, triggerName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const triggerNameStr = mOptions.literal(triggerName);
    const tableNameStr = mOptions.literal(tableName);
    return `DROP TRIGGER${ifExistsStr} ${triggerNameStr} ON ${tableNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/triggers/createTrigger.ts
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

// src/operations/triggers/renameTrigger.ts
function renameTrigger(mOptions) {
  const _rename = (tableName, oldTriggerName, newTriggerName) => {
    const oldTriggerNameStr = mOptions.literal(oldTriggerName);
    const tableNameStr = mOptions.literal(tableName);
    const newTriggerNameStr = mOptions.literal(newTriggerName);
    return `ALTER TRIGGER ${oldTriggerNameStr} ON ${tableNameStr} RENAME TO ${newTriggerNameStr};`;
  };
  _rename.reverse = (tableName, oldTriggerName, newTriggerName) => _rename(tableName, newTriggerName, oldTriggerName);
  return _rename;
}

// src/operations/types/dropTypeAttribute.ts
function dropTypeAttribute(mOptions) {
  const _drop = (typeName, attributeName, options = {}) => {
    const { ifExists = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const typeNameStr = mOptions.literal(typeName);
    const attributeNameStr = mOptions.literal(attributeName);
    return `ALTER TYPE ${typeNameStr} DROP ATTRIBUTE ${attributeNameStr}${ifExistsStr};`;
  };
  return _drop;
}

// src/operations/types/addTypeAttribute.ts
function addTypeAttribute(mOptions) {
  const _alterAttributeAdd = (typeName, attributeName, attributeType) => {
    const typeStr = applyType(attributeType, mOptions.typeShorthands).type;
    const typeNameStr = mOptions.literal(typeName);
    const attributeNameStr = mOptions.literal(attributeName);
    return `ALTER TYPE ${typeNameStr} ADD ATTRIBUTE ${attributeNameStr} ${typeStr};`;
  };
  _alterAttributeAdd.reverse = dropTypeAttribute(mOptions);
  return _alterAttributeAdd;
}

// src/operations/types/addTypeValue.ts
function addTypeValue(mOptions) {
  const _add = (typeName, value, options = {}) => {
    const { before, after, ifNotExists = false } = options;
    if (before && after) {
      throw new Error(`"before" and "after" can't be specified together`);
    }
    const beforeStr = before ? ` BEFORE ${escapeValue(before)}` : "";
    const afterStr = after ? ` AFTER ${escapeValue(after)}` : "";
    const ifNotExistsStr = ifNotExists ? " IF NOT EXISTS" : "";
    const valueStr = escapeValue(value);
    const typeNameStr = mOptions.literal(typeName);
    return `ALTER TYPE ${typeNameStr} ADD VALUE${ifNotExistsStr} ${valueStr}${beforeStr}${afterStr};`;
  };
  return _add;
}

// src/operations/types/dropType.ts
function dropType(mOptions) {
  const _drop = (typeName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const typeNameStr = mOptions.literal(typeName);
    return `DROP TYPE${ifExistsStr} ${typeNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/types/createType.ts
function createType(mOptions) {
  const _create = (typeName, options) => {
    if (Array.isArray(options)) {
      const optionsStr = options.map(escapeValue).join(", ");
      const typeNameStr = mOptions.literal(typeName);
      return `CREATE TYPE ${typeNameStr} AS ENUM (${optionsStr});`;
    }
    const attributes = Object.entries(options).map(([attributeName, attribute]) => {
      const typeStr = applyType(attribute, mOptions.typeShorthands).type;
      return `${mOptions.literal(attributeName)} ${typeStr}`;
    }).join(",\n");
    return `CREATE TYPE ${mOptions.literal(typeName)} AS (
${attributes}
);`;
  };
  _create.reverse = dropType(mOptions);
  return _create;
}

// src/operations/types/renameType.ts
function renameType(mOptions) {
  const _rename = (typeName, newTypeName) => {
    const typeNameStr = mOptions.literal(typeName);
    const newTypeNameStr = mOptions.literal(newTypeName);
    return `ALTER TYPE ${typeNameStr} RENAME TO ${newTypeNameStr};`;
  };
  _rename.reverse = (typeName, newTypeName) => _rename(newTypeName, typeName);
  return _rename;
}

// src/operations/types/renameTypeAttribute.ts
function renameTypeAttribute(mOptions) {
  const _rename = (typeName, attributeName, newAttributeName) => {
    const typeNameStr = mOptions.literal(typeName);
    const attributeNameStr = mOptions.literal(attributeName);
    const newAttributeNameStr = mOptions.literal(newAttributeName);
    return `ALTER TYPE ${typeNameStr} RENAME ATTRIBUTE ${attributeNameStr} TO ${newAttributeNameStr};`;
  };
  _rename.reverse = (typeName, attributeName, newAttributeName) => _rename(typeName, newAttributeName, attributeName);
  return _rename;
}

// src/operations/types/renameTypeValue.ts
function renameTypeValue(mOptions) {
  const _rename = (typeName, value, newValue) => {
    const valueStr = escapeValue(value);
    const newValueStr = escapeValue(newValue);
    const typeNameStr = mOptions.literal(typeName);
    return `ALTER TYPE ${typeNameStr} RENAME VALUE ${valueStr} TO ${newValueStr};`;
  };
  _rename.reverse = (typeName, value, newValue) => _rename(typeName, newValue, value);
  return _rename;
}

// src/operations/types/setTypeAttribute.ts
function setTypeAttribute(mOptions) {
  return (typeName, attributeName, attributeType) => {
    const typeStr = applyType(attributeType, mOptions.typeShorthands).type;
    const typeNameStr = mOptions.literal(typeName);
    const attributeNameStr = mOptions.literal(attributeName);
    return `ALTER TYPE ${typeNameStr} ALTER ATTRIBUTE ${attributeNameStr} SET DATA TYPE ${typeStr};`;
  };
}

// src/operations/views/shared.ts
function viewOptionStr(options) {
  return (key) => {
    const value = options[key] === true ? "" : ` = ${options[key]}`;
    return `${key}${value}`;
  };
}

// src/operations/views/alterView.ts
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

// src/operations/views/alterViewColumn.ts
function alterViewColumn(mOptions) {
  const _alter = (viewName, columnName, options) => {
    const { default: defaultValue } = options;
    const actions = [];
    if (defaultValue === null) {
      actions.push("DROP DEFAULT");
    } else if (defaultValue !== void 0) {
      actions.push(`SET DEFAULT ${escapeValue(defaultValue)}`);
    }
    const viewNameStr = mOptions.literal(viewName);
    const columnNameStr = mOptions.literal(columnName);
    return actions.map(
      (action) => `ALTER VIEW ${viewNameStr} ALTER COLUMN ${columnNameStr} ${action};`
    ).join("\n");
  };
  return _alter;
}

// src/operations/views/dropView.ts
function dropView(mOptions) {
  const _drop = (viewName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const viewNameStr = mOptions.literal(viewName);
    return `DROP VIEW${ifExistsStr} ${viewNameStr}${cascadeStr};`;
  };
  return _drop;
}

// src/operations/views/createView.ts
function createView(mOptions) {
  const _create = (viewName, viewOptions, definition) => {
    const {
      temporary = false,
      replace = false,
      recursive = false,
      columns = [],
      options = {},
      checkOption
    } = viewOptions;
    const columnNames = toArray(columns).map(mOptions.literal).join(", ");
    const withOptions = Object.keys(options).map(viewOptionStr(options)).join(", ");
    const replaceStr = replace ? " OR REPLACE" : "";
    const temporaryStr = temporary ? " TEMPORARY" : "";
    const recursiveStr = recursive ? " RECURSIVE" : "";
    const columnStr = columnNames ? `(${columnNames})` : "";
    const withOptionsStr = withOptions ? ` WITH (${withOptions})` : "";
    const checkOptionStr = checkOption ? ` WITH ${checkOption} CHECK OPTION` : "";
    const viewNameStr = mOptions.literal(viewName);
    return `CREATE${replaceStr}${temporaryStr}${recursiveStr} VIEW ${viewNameStr}${columnStr}${withOptionsStr} AS ${definition}${checkOptionStr};`;
  };
  _create.reverse = dropView(mOptions);
  return _create;
}

// src/operations/views/renameView.ts
function renameView(mOptions) {
  const _rename = (viewName, newViewName) => {
    const viewNameStr = mOptions.literal(viewName);
    const newViewNameStr = mOptions.literal(newViewName);
    return `ALTER VIEW ${viewNameStr} RENAME TO ${newViewNameStr};`;
  };
  _rename.reverse = (viewName, newViewName) => _rename(newViewName, viewName);
  return _rename;
}

// src/migrationBuilder.ts
var MigrationBuilder = class {
  /**
   * Install an extension.
   *
   * @alias addExtension
   *
   * @see https://www.postgresql.org/docs/current/sql-createextension.html
   */
  createExtension;
  /**
   * Remove an extension.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropextension.html
   */
  dropExtension;
  /**
   * Install an extension.
   *
   * @alias createExtension
   *
   * @see https://www.postgresql.org/docs/current/sql-createextension.html
   */
  addExtension;
  /**
   * Define a new table.
   *
   * @see https://www.postgresql.org/docs/current/sql-createtable.html
   */
  createTable;
  /**
   * Remove a table.
   *
   * @see https://www.postgresql.org/docs/current/sql-droptable.html
   */
  dropTable;
  /**
   * Rename a table.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  renameTable;
  /**
   * Change the definition of a table.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  alterTable;
  /**
   * Add columns to a table.
   *
   * @alias addColumn
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  addColumns;
  /**
   * Remove columns from a table.
   *
   * @alias dropColumn
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  dropColumns;
  /**
   * Rename a column.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  renameColumn;
  /**
   * Change the definition of a column.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  alterColumn;
  /**
   * Add a column to a table.
   *
   * @alias addColumns
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  addColumn;
  /**
   * Remove a column from a table.
   *
   * @alias dropColumns
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  dropColumn;
  /**
   * Add a constraint to a table.
   *
   * @alias createConstraint
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  addConstraint;
  /**
   * Remove a constraint from a table.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  dropConstraint;
  /**
   * Rename a constraint.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  renameConstraint;
  /**
   * Add a constraint to a table.
   *
   * @alias addConstraint
   *
   * @see https://www.postgresql.org/docs/current/sql-altertable.html
   */
  createConstraint;
  /**
   * Define a new data type.
   *
   * @alias addType
   *
   * @see https://www.postgresql.org/docs/current/sql-createtype.html
   */
  createType;
  /**
   * Remove a data type.
   *
   * @see https://www.postgresql.org/docs/current/sql-droptype.html
   */
  dropType;
  /**
   * Define a new data type.
   *
   * @alias createType
   *
   * @see https://www.postgresql.org/docs/current/sql-createtype.html
   */
  addType;
  /**
   * Rename a data type.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertype.html
   */
  renameType;
  /**
   * Rename a data type attribute.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertype.html
   */
  renameTypeAttribute;
  /**
   * Rename a data type value.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertype.html
   */
  renameTypeValue;
  /**
   * Add an attribute to a data type.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertype.html
   */
  addTypeAttribute;
  /**
   * Remove an attribute from a data type.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertype.html
   */
  dropTypeAttribute;
  /**
   * Set an attribute of a data type.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertype.html
   */
  setTypeAttribute;
  /**
   * Add a value to a data type.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertype.html
   */
  addTypeValue;
  /**
   * Define a new index.
   *
   * @alias addIndex
   *
   * @see https://www.postgresql.org/docs/current/sql-createindex.html
   */
  createIndex;
  /**
   * Remove an index.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropindex.html
   */
  dropIndex;
  /**
   * Define a new index.
   *
   * @alias createIndex
   *
   * @see https://www.postgresql.org/docs/current/sql-createindex.html
   */
  addIndex;
  /**
   * Define a new database role.
   *
   * @see https://www.postgresql.org/docs/current/sql-createrole.html
   */
  createRole;
  /**
   * Remove a database role.
   *
   * @see https://www.postgresql.org/docs/current/sql-droprole.html
   */
  dropRole;
  /**
   * Change a database role.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterrole.html
   */
  alterRole;
  /**
   * Rename a database role.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterrole.html
   */
  renameRole;
  /**
   * Define a new function.
   *
   * @see https://www.postgresql.org/docs/current/sql-createfunction.html
   */
  createFunction;
  /**
   * Remove a function.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropfunction.html
   */
  dropFunction;
  /**
   * Rename a function.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterfunction.html
   */
  renameFunction;
  /**
   * Define a new trigger.
   *
   * @see https://www.postgresql.org/docs/current/sql-createtrigger.html
   */
  createTrigger;
  /**
   * Remove a trigger.
   *
   * @see https://www.postgresql.org/docs/current/sql-droptrigger.html
   */
  dropTrigger;
  /**
   * Rename a trigger.
   *
   * @see https://www.postgresql.org/docs/current/sql-altertrigger.html
   */
  renameTrigger;
  /**
   * Define a new schema.
   *
   * @see https://www.postgresql.org/docs/current/sql-createschema.html
   */
  createSchema;
  /**
   * Remove a schema.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropschema.html
   */
  dropSchema;
  /**
   * Rename a schema.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterschema.html
   */
  renameSchema;
  /**
   * Define a new domain.
   *
   * @see https://www.postgresql.org/docs/current/sql-createdomain.html
   */
  createDomain;
  /**
   * Remove a domain.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropdomain.html
   */
  dropDomain;
  /**
   * Change the definition of a domain.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterdomain.html
   */
  alterDomain;
  /**
   * Rename a domain.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterdomain.html
   */
  renameDomain;
  /**
   * Define a new sequence generator.
   *
   * @see https://www.postgresql.org/docs/current/sql-createsequence.html
   */
  createSequence;
  /**
   * Remove a sequence.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropsequence.html
   */
  dropSequence;
  /**
   * Change the definition of a sequence generator.
   *
   * @see https://www.postgresql.org/docs/current/sql-altersequence.html
   */
  alterSequence;
  /**
   * Rename a sequence.
   *
   * @see https://www.postgresql.org/docs/current/sql-altersequence.html
   */
  renameSequence;
  /**
   * Define a new operator.
   *
   * @see https://www.postgresql.org/docs/current/sql-createoperator.html
   */
  createOperator;
  /**
   * Remove an operator.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropoperator.html
   */
  dropOperator;
  /**
   * Define a new operator class.
   *
   * @see https://www.postgresql.org/docs/current/sql-createopclass.html
   */
  createOperatorClass;
  /**
   * Remove an operator class.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropopclass.html
   */
  dropOperatorClass;
  /**
   * Rename an operator class.
   *
   * @see https://www.postgresql.org/docs/current/sql-alteropclass.html
   */
  renameOperatorClass;
  /**
   * Define a new operator family.
   *
   * @see https://www.postgresql.org/docs/current/sql-createopfamily.html
   */
  createOperatorFamily;
  /**
   * Remove an operator family.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropopfamily.html
   */
  dropOperatorFamily;
  /**
   * Rename an operator family.
   *
   * @see https://www.postgresql.org/docs/current/sql-alteropfamily.html
   */
  renameOperatorFamily;
  /**
   * Add an operator to an operator family.
   *
   * @see https://www.postgresql.org/docs/current/sql-alteropfamily.html
   */
  addToOperatorFamily;
  /**
   * Remove an operator from an operator family.
   *
   * @see https://www.postgresql.org/docs/current/sql-alteropfamily.html
   */
  removeFromOperatorFamily;
  /**
   * Define a new row-level security policy for a table.
   *
   * @see https://www.postgresql.org/docs/current/sql-createpolicy.html
   */
  createPolicy;
  /**
   * Remove a row-level security policy from a table.
   *
   * @see https://www.postgresql.org/docs/current/sql-droppolicy.html
   */
  dropPolicy;
  /**
   * Change the definition of a row-level security policy.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterpolicy.html
   */
  alterPolicy;
  /**
   * Rename a row-level security policy.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterpolicy.html
   */
  renamePolicy;
  /**
   * Define a new view.
   *
   * @see https://www.postgresql.org/docs/current/sql-createview.html
   */
  createView;
  /**
   * Remove a view.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropview.html
   */
  dropView;
  /**
   * Change the definition of a view.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterview.html
   */
  alterView;
  /**
   * Change the definition of a view column.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterview.html
   */
  alterViewColumn;
  /**
   * Rename a view.
   *
   * @see https://www.postgresql.org/docs/current/sql-alterview.html
   */
  renameView;
  /**
   * Define a new materialized view.
   *
   * @see https://www.postgresql.org/docs/current/sql-creatematerializedview.html
   */
  createMaterializedView;
  /**
   * Remove a materialized view.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropmaterializedview.html
   */
  dropMaterializedView;
  /**
   * Change the definition of a materialized view.
   *
   * @see https://www.postgresql.org/docs/current/sql-altermaterializedview.html
   */
  alterMaterializedView;
  /**
   * Rename a materialized view.
   *
   * @see https://www.postgresql.org/docs/current/sql-altermaterializedview.html
   */
  renameMaterializedView;
  /**
   * Rename a materialized view column.
   *
   * @see https://www.postgresql.org/docs/current/sql-altermaterializedview.html
   */
  renameMaterializedViewColumn;
  /**
   * Replace the contents of a materialized view.
   *
   * @see https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
   */
  refreshMaterializedView;
  /**
   * Define access privileges.
   *
   * @see https://www.postgresql.org/docs/current/sql-grant.html
   */
  grantRoles;
  /**
   * Remove access privileges.
   *
   * @see https://www.postgresql.org/docs/current/sql-revoke.html
   */
  revokeRoles;
  /**
   * Define access privileges.
   *
   * @see https://www.postgresql.org/docs/current/sql-grant.html
   */
  grantOnSchemas;
  /**
   * Remove access privileges.
   *
   * @see https://www.postgresql.org/docs/current/sql-revoke.html
   */
  revokeOnSchemas;
  /**
   * Define access privileges.
   *
   * @see https://www.postgresql.org/docs/current/sql-grant.html
   */
  grantOnTables;
  /**
   * Remove access privileges.
   *
   * @see https://www.postgresql.org/docs/current/sql-revoke.html
   */
  revokeOnTables;
  /**
   * Define a new cast.
   *
   * @see https://www.postgresql.org/docs/current/sql-createcast.html
   */
  createCast;
  /**
   * Remove a cast.
   *
   * @see https://www.postgresql.org/docs/current/sql-dropcast.html
   */
  dropCast;
  /**
   * Run raw SQL, with some optional _[very basic](http://mir.aculo.us/2011/03/09/little-helpers-a-tweet-sized-javascript-templating-engine/)_ mustache templating.
   *
   * This is a low-level operation, and you should use the higher-level operations whenever possible.
   *
   * @param sql SQL query to run.
   * @param args Optional `key/val` of arguments to replace.
   *
   * @see https://www.postgresql.org/docs/current/sql-commands.html
   */
  sql;
  /**
   * Inserts raw string, **which is not escaped**.
   *
   * @param sql String to **not escaped**.
   *
   * @example
   * { default: pgm.func('CURRENT_TIMESTAMP') }
   */
  func;
  /**
   * The `db` client instance.
   *
   * Can be used to run queries directly.
   */
  db;
  _steps;
  _REVERSE_MODE;
  _useTransaction;
  constructor(db2, typeShorthands, shouldDecamelize, logger) {
    this._steps = [];
    this._REVERSE_MODE = false;
    this._useTransaction = true;
    const wrap = (operation) => (...args) => {
      if (this._REVERSE_MODE) {
        if (typeof operation.reverse !== "function") {
          const name = `pgm.${operation.name}()`;
          throw new Error(
            `Impossible to automatically infer down migration for "${name}"`
          );
        }
        this._steps = this._steps.concat(operation.reverse(...args));
      } else {
        this._steps = this._steps.concat(operation(...args));
      }
    };
    const options = {
      typeShorthands,
      schemalize: createSchemalize({ shouldDecamelize, shouldQuote: false }),
      literal: createSchemalize({ shouldDecamelize, shouldQuote: true }),
      logger
    };
    this.createExtension = wrap(createExtension(options));
    this.dropExtension = wrap(dropExtension(options));
    this.addExtension = this.createExtension;
    this.createTable = wrap(createTable(options));
    this.dropTable = wrap(dropTable(options));
    this.renameTable = wrap(renameTable(options));
    this.alterTable = wrap(alterTable(options));
    this.addColumns = wrap(addColumns(options));
    this.dropColumns = wrap(dropColumns(options));
    this.renameColumn = wrap(renameColumn(options));
    this.alterColumn = wrap(alterColumn(options));
    this.addColumn = this.addColumns;
    this.dropColumn = this.dropColumns;
    this.addConstraint = wrap(addConstraint(options));
    this.dropConstraint = wrap(dropConstraint(options));
    this.renameConstraint = wrap(renameConstraint(options));
    this.createConstraint = this.addConstraint;
    this.createType = wrap(createType(options));
    this.dropType = wrap(dropType(options));
    this.addType = this.createType;
    this.renameType = wrap(renameType(options));
    this.renameTypeAttribute = wrap(renameTypeAttribute(options));
    this.renameTypeValue = wrap(renameTypeValue(options));
    this.addTypeAttribute = wrap(addTypeAttribute(options));
    this.dropTypeAttribute = wrap(dropTypeAttribute(options));
    this.setTypeAttribute = wrap(setTypeAttribute(options));
    this.addTypeValue = wrap(addTypeValue(options));
    this.createIndex = wrap(createIndex(options));
    this.dropIndex = wrap(dropIndex(options));
    this.addIndex = this.createIndex;
    this.createRole = wrap(createRole(options));
    this.dropRole = wrap(dropRole(options));
    this.alterRole = wrap(alterRole(options));
    this.renameRole = wrap(renameRole(options));
    this.createFunction = wrap(createFunction(options));
    this.dropFunction = wrap(dropFunction(options));
    this.renameFunction = wrap(renameFunction(options));
    this.createTrigger = wrap(createTrigger(options));
    this.dropTrigger = wrap(dropTrigger(options));
    this.renameTrigger = wrap(renameTrigger(options));
    this.createSchema = wrap(createSchema(options));
    this.dropSchema = wrap(dropSchema(options));
    this.renameSchema = wrap(renameSchema(options));
    this.createDomain = wrap(createDomain(options));
    this.dropDomain = wrap(dropDomain(options));
    this.alterDomain = wrap(alterDomain(options));
    this.renameDomain = wrap(renameDomain(options));
    this.createSequence = wrap(createSequence(options));
    this.dropSequence = wrap(dropSequence(options));
    this.alterSequence = wrap(alterSequence(options));
    this.renameSequence = wrap(renameSequence(options));
    this.createOperator = wrap(createOperator(options));
    this.dropOperator = wrap(dropOperator(options));
    this.createOperatorClass = wrap(createOperatorClass(options));
    this.dropOperatorClass = wrap(dropOperatorClass(options));
    this.renameOperatorClass = wrap(renameOperatorClass(options));
    this.createOperatorFamily = wrap(createOperatorFamily(options));
    this.dropOperatorFamily = wrap(dropOperatorFamily(options));
    this.renameOperatorFamily = wrap(renameOperatorFamily(options));
    this.addToOperatorFamily = wrap(addToOperatorFamily(options));
    this.removeFromOperatorFamily = wrap(
      removeFromOperatorFamily(options)
    );
    this.createPolicy = wrap(createPolicy(options));
    this.dropPolicy = wrap(dropPolicy(options));
    this.alterPolicy = wrap(alterPolicy(options));
    this.renamePolicy = wrap(renamePolicy(options));
    this.createView = wrap(createView(options));
    this.dropView = wrap(dropView(options));
    this.alterView = wrap(alterView(options));
    this.alterViewColumn = wrap(alterViewColumn(options));
    this.renameView = wrap(renameView(options));
    this.createMaterializedView = wrap(createMaterializedView(options));
    this.dropMaterializedView = wrap(dropMaterializedView(options));
    this.alterMaterializedView = wrap(alterMaterializedView(options));
    this.renameMaterializedView = wrap(renameMaterializedView(options));
    this.renameMaterializedViewColumn = wrap(
      renameMaterializedViewColumn(options)
    );
    this.refreshMaterializedView = wrap(
      refreshMaterializedView(options)
    );
    this.grantRoles = wrap(grantRoles(options));
    this.revokeRoles = wrap(revokeRoles(options));
    this.grantOnSchemas = wrap(grantOnSchemas(options));
    this.revokeOnSchemas = wrap(revokeOnSchemas(options));
    this.grantOnTables = wrap(grantOnTables(options));
    this.revokeOnTables = wrap(revokeOnTables(options));
    this.createCast = wrap(createCast(options));
    this.dropCast = wrap(dropCast(options));
    this.sql = wrap(sql(options));
    this.func = PgLiteral.create;
    const wrapDB = (operation) => (...args) => {
      if (this._REVERSE_MODE) {
        throw new Error("Impossible to automatically infer down migration");
      }
      return operation(...args);
    };
    this.db = {
      query: wrapDB(db2.query),
      select: wrapDB(db2.select)
    };
  }
  /**
   * Run the reverse of the migration. Useful for creating a new migration that
   * reverts a previous migration.
   */
  enableReverseMode() {
    this._REVERSE_MODE = true;
    return this;
  }
  /**
   * By default, all migrations are run in one transaction, but some DB
   * operations like add type value (`pgm.addTypeValue`) does not work if the
   * type is not created in the same transaction.
   * e.g. if it is created in previous migration. You need to run specific
   * migration outside a transaction (`pgm.noTransaction`).
   * Be aware that this means that you can have some migrations applied and some
   * not applied, if there is some error during migrating (leading to `ROLLBACK`).
   */
  noTransaction() {
    this._useTransaction = false;
    return this;
  }
  isUsingTransaction() {
    return this._useTransaction;
  }
  getSql() {
    return `${this.getSqlSteps().join("\n")}
`;
  }
  getSqlSteps() {
    return this._REVERSE_MODE ? [...this._steps].reverse() : this._steps;
  }
};

// src/migration.ts
var FilenameFormat = Object.freeze({
  timestamp: "timestamp",
  utc: "utc"
});
var SEPARATOR = "_";
function localeCompareStringsNumerically(a, b) {
  return a.localeCompare(b, void 0, {
    usage: "sort",
    numeric: true,
    sensitivity: "variant",
    ignorePunctuation: true
  });
}
function compareFileNamesByTimestamp(a, b, logger) {
  const aTimestamp = getNumericPrefix(a, logger);
  const bTimestamp = getNumericPrefix(b, logger);
  return aTimestamp - bTimestamp;
}
async function getMigrationFilePaths(dir, options = {}) {
  const { ignorePattern, useGlob = false, logger } = options;
  if (useGlob) {
    const globMatches = await glob(dir, {
      ignore: ignorePattern,
      nodir: true,
      withFileTypes: true
    });
    return globMatches.sort(
      (a, b) => compareFileNamesByTimestamp(a.name, b.name, logger) || localeCompareStringsNumerically(a.name, b.name)
    ).map((pathScurry) => pathScurry.fullpath());
  }
  if (Array.isArray(dir) || Array.isArray(ignorePattern)) {
    throw new TypeError(
      'Options "dir" and "ignorePattern" can only be arrays when "useGlob" is true'
    );
  }
  const ignoreRegexp = new RegExp(
    ignorePattern?.length ? `^${ignorePattern}$` : "^\\..*"
  );
  const dirContent = await readdir(`${dir}/`, { withFileTypes: true });
  return dirContent.filter(
    (dirent) => (dirent.isFile() || dirent.isSymbolicLink()) && !ignoreRegexp.test(dirent.name)
  ).sort(
    (a, b) => compareFileNamesByTimestamp(a.name, b.name, logger) || localeCompareStringsNumerically(a.name, b.name)
  ).map((dirent) => resolve(dir, dirent.name));
}
function getSuffixFromFileName(fileName) {
  return extname(fileName).slice(1);
}
async function getLastSuffix(dir, ignorePattern) {
  try {
    const files = await getMigrationFilePaths(dir, { ignorePattern });
    return files.length > 0 ? getSuffixFromFileName(files[files.length - 1]) : void 0;
  } catch {
    return void 0;
  }
}
function getNumericPrefix(filename, logger = console) {
  const prefix = filename.split(SEPARATOR)[0];
  if (prefix && /^\d+$/.test(prefix)) {
    if (prefix.length === 13) {
      return Number(prefix);
    }
    if (prefix && prefix.length === 17) {
      const year = prefix.slice(0, 4);
      const month = prefix.slice(4, 6);
      const date = prefix.slice(6, 8);
      const hours = prefix.slice(8, 10);
      const minutes = prefix.slice(10, 12);
      const seconds = prefix.slice(12, 14);
      const ms = prefix.slice(14, 17);
      return (/* @__PURE__ */ new Date(
        `${year}-${month}-${date}T${hours}:${minutes}:${seconds}.${ms}Z`
      )).valueOf();
    }
  }
  logger.error(`Can't determine timestamp for ${prefix}`);
  return Number(prefix) || 0;
}
async function resolveSuffix(directory, options) {
  const { language, ignorePattern } = options;
  return language || await getLastSuffix(directory, ignorePattern) || "js";
}
var Migration = class {
  // class method that creates a new migration file by cloning the migration template
  static async create(name, directory, options = {}) {
    const { filenameFormat = FilenameFormat.timestamp } = options;
    await mkdir(directory, { recursive: true });
    const now = /* @__PURE__ */ new Date();
    const time = filenameFormat === FilenameFormat.utc ? now.toISOString().replace(/\D/g, "") : now.valueOf();
    const templateFileName = "templateFileName" in options ? resolve(cwd(), options.templateFileName) : join(
      import.meta.dirname,
      "..",
      "..",
      "templates",
      `migration-template.${await resolveSuffix(directory, options)}`
    );
    const suffix = getSuffixFromFileName(templateFileName);
    const newFile = join(directory, `${time}${SEPARATOR}${name}.${suffix}`);
    await new Promise((resolve2, reject) => {
      createReadStream(templateFileName).pipe(createWriteStream(newFile)).on("close", resolve2).on("error", reject);
    });
    return newFile;
  }
  db;
  path;
  name;
  timestamp;
  up;
  down;
  options;
  typeShorthands;
  logger;
  constructor(db2, migrationPath, { up, down }, options, typeShorthands, logger = console) {
    this.db = db2;
    this.path = migrationPath;
    this.name = basename(migrationPath, extname(migrationPath));
    this.timestamp = getNumericPrefix(this.name, logger);
    this.up = up;
    this.down = down;
    this.options = options;
    this.typeShorthands = typeShorthands;
    this.logger = logger;
  }
  _getMarkAsRun(action) {
    const schema = getMigrationTableSchema(this.options);
    const { migrationsTable } = this.options;
    const { name } = this;
    switch (action) {
      case this.down: {
        this.logger.info(`### MIGRATION ${this.name} (DOWN) ###`);
        return `DELETE FROM "${schema}"."${migrationsTable}" WHERE name='${name}';`;
      }
      case this.up: {
        this.logger.info(`### MIGRATION ${this.name} (UP) ###`);
        return `INSERT INTO "${schema}"."${migrationsTable}" (name, run_on) VALUES ('${name}', NOW());`;
      }
      default: {
        throw new Error("Unknown direction");
      }
    }
  }
  async _apply(action, pgm) {
    if (action.length === 2) {
      await new Promise((resolve2) => {
        action(pgm, resolve2);
      });
    } else {
      await action(pgm);
    }
    const sqlSteps = pgm.getSqlSteps();
    sqlSteps.push(this._getMarkAsRun(action));
    if (!this.options.singleTransaction && pgm.isUsingTransaction()) {
      sqlSteps.unshift("BEGIN;");
      sqlSteps.push("COMMIT;");
    } else if (this.options.singleTransaction && !pgm.isUsingTransaction()) {
      this.logger.warn("#> WARNING: Need to break single transaction! <");
      sqlSteps.unshift("COMMIT;");
      sqlSteps.push("BEGIN;");
    } else if (!this.options.singleTransaction || !pgm.isUsingTransaction()) {
      this.logger.warn(
        "#> WARNING: This migration is not wrapped in a transaction! <"
      );
    }
    if (typeof this.logger.debug === "function") {
      this.logger.debug(`${sqlSteps.join("\n")}

`);
    }
    return sqlSteps.reduce(
      (promise, sql2) => promise.then(() => this.options.dryRun || this.db.query(sql2)),
      Promise.resolve()
    );
  }
  _getAction(direction) {
    if (direction === "down" && this.down === void 0) {
      this.down = this.up;
    }
    const action = this[direction];
    if (action === false) {
      throw new Error(
        `User has disabled ${direction} migration on file: ${this.name}`
      );
    }
    if (typeof action !== "function") {
      throw new Error(
        `Unknown value for direction: ${direction}. Is the migration ${this.name} exporting a '${direction}' function?`
      );
    }
    return action;
  }
  apply(direction) {
    const pgm = new MigrationBuilder(
      this.db,
      this.typeShorthands,
      Boolean(this.options.decamelize),
      this.logger
    );
    const action = this._getAction(direction);
    if (this.down === this.up) {
      pgm.enableReverseMode();
    }
    return this._apply(action, pgm);
  }
  markAsRun(direction) {
    return this.db.query(this._getMarkAsRun(this._getAction(direction)));
  }
};

// src/pgType.ts
var PgType = Object.freeze({
  /**
   * signed eight-byte integer
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
   */
  BIGINT: "bigint",
  /**
   * alias for bigint
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
   */
  INT8: "int8",
  /**
   * autoincrementing eight-byte integer
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
   */
  BIGSERIAL: "bigserial",
  /**
   * alias for bigserial
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
   */
  SERIAL8: "serial8",
  /**
   * fixed-length bit string
   *
   * @see https://www.postgresql.org/docs/current/datatype-bit.html#DATATYPE-BIT
   */
  BIT: "bit",
  /**
   * fixed-length bit string
   *
   * @see https://www.postgresql.org/docs/current/datatype-bit.html#DATATYPE-BIT
   */
  BIT_1: "bit",
  /**
   * variable-length bit string
   *
   * @see https://www.postgresql.org/docs/current/datatype-bit.html#DATATYPE-BIT
   */
  BIT_VARYING: "bit varying",
  /**
   * alias for bit varying
   *
   * @see https://www.postgresql.org/docs/current/datatype-bit.html#DATATYPE-BIT
   */
  VARBIT: "varbit",
  /**
   * logical Boolean (true/false)
   *
   * @see https://www.postgresql.org/docs/current/datatype-boolean.html#DATATYPE-BOOLEAN
   */
  BOOLEAN: "boolean",
  /**
   * alias for boolean
   *
   * @see https://www.postgresql.org/docs/current/datatype-boolean.html#DATATYPE-BOOLEAN
   */
  BOOL: "bool",
  /**
   * rectangular box on a plane
   *
   * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
   */
  BOX: "box",
  /**
   * binary data ("byte array")
   *
   * @see https://www.postgresql.org/docs/current/datatype-binary.html#DATATYPE-BINARY
   */
  BYTEA: "bytea",
  /**
   * fixed-length character string
   *
   * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
   */
  CHARACTER: "character",
  /**
   * alias for character
   *
   * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
   */
  CHAR: "char",
  /**
   * variable-length character string
   *
   * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
   */
  CHARACTER_VARYING: "character varying",
  /**
   * alias for character varying
   *
   * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
   */
  VARCHAR: "varchar",
  /**
   * IPv4 or IPv6 network address
   *
   * @see https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-NET-TYPES
   */
  CIDR: "cidr",
  /**
   * circle on a plane
   *
   * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
   */
  CIRCLE: "circle",
  /**
   * calendar date (year, month, day)
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  DATE: "date",
  /**
   * float8	double precision floating-point number (8 bytes)
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-FLOAT
   */
  DOUBLE_PRECISION: "double precision",
  /**
   * alias for double precision
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-FLOAT
   */
  FLOAT8: "float8",
  /**
   * IPv4 or IPv6 host address
   *
   * @see https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-NET-TYPES
   */
  INET: "inet",
  /**
   * signed four-byte integer
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
   */
  INTEGER: "integer",
  /**
   * alias for integer
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
   */
  INT: "int",
  /**
   * alias for integer
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
   */
  INT4: "int4",
  /**
   * time span
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  INTERVAL: "interval",
  /**
   * textual JSON data
   *
   * @see https://www.postgresql.org/docs/current/datatype-json.html#DATATYPE-JSON
   */
  JSON: "json",
  /**
   * binary JSON data, decomposed
   *
   * @see https://www.postgresql.org/docs/current/datatype-json.html#DATATYPE-JSON
   */
  JSONB: "jsonb",
  /**
   * infinite line on a plane
   *
   * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
   */
  LINE: "line",
  /**
   * line segment on a plane
   *
   * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
   */
  LSEG: "lseg",
  /**
   * MAC (Media Access Control) address
   *
   * @see https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-NET-TYPES
   */
  MACADDR: "macaddr",
  /**
   * MAC (Media Access Control) address (EUI-64 format)
   *
   * @see https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-NET-TYPES
   */
  MACADDR8: "macaddr8",
  /**
   * currency amount
   *
   * @see https://www.postgresql.org/docs/current/datatype-money.html#DATATYPE-MONEY
   */
  MONEY: "money",
  /**
   * exact numeric of selectable precision
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL
   */
  NUMERIC: "numeric",
  /**
   * alias for numeric
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL
   */
  DECIMAL: "decimal",
  /**
   * geometric path on a plane
   *
   * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
   */
  PATH: "path",
  /**
   * PostgreSQL Log Sequence Number
   *
   * @see https://www.postgresql.org/docs/current/datatype-pg-lsn.html#DATATYPE-PG-LSN
   */
  PG_LSN: "pg_lsn",
  /**
   * user-level transaction ID snapshot
   */
  PG_SNAPSHOT: "pg_snapshot",
  /**
   * geometric point on a plane
   *
   * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
   */
  POINT: "point",
  /**
   * closed geometric path on a plane
   *
   * @see https://www.postgresql.org/docs/current/datatype-geometric.html#DATATYPE-GEOMETRIC
   */
  POLYGON: "polygon",
  /**
   * single precision floating-point number (4 bytes)
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-FLOAT
   */
  REAL: "real",
  /**
   * alias for real
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-FLOAT
   */
  FLOAT4: "float4",
  /**
   * signed two-byte integer
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
   */
  SMALLINT: "smallint",
  /**
   * alias for smallint
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
   */
  INT2: "int2",
  /**
   * autoincrementing two-byte integer
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
   */
  SMALLSERIAL: "smallserial",
  /**
   * alias for smallserial
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
   */
  SERIAL2: "serial2",
  /**
   * autoincrementing four-byte integer
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
   */
  SERIAL: "serial",
  /**
   * alias for serial
   *
   * @see https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL
   */
  SERIAL4: "serial4",
  /**
   * variable-length character string
   *
   * @see https://www.postgresql.org/docs/current/datatype-character.html#DATATYPE-CHARACTER
   */
  TEXT: "text",
  /**
   * time of day (no time zone)
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  TIME: "time",
  /**
   * alias of time
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  TIME_WITHOUT_TIME_ZONE: "time without time zone",
  /**
   * time of day, including time zone
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  TIME_WITH_TIME_ZONE: "time with time zone",
  /**
   * alias of time with time zone
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  TIMETZ: "timetz",
  /**
   * date and time (no time zone)
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  TIMESTAMP: "timestamp",
  /**
   * alias of timestamp
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  TIMESTAMP_WITHOUT_TIME_ZONE: "timestamp without time zone",
  /**
   * date and time, including time zone
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  TIMESTAMP_WITH_TIME_ZONE: "timestamp with time zone",
  /**
   * alias of timestamp with time zone
   *
   * @see https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME
   */
  TIMESTAMPTZ: "timestamptz",
  /**
   * text search query
   *
   * @see https://www.postgresql.org/docs/current/datatype-textsearch.html#DATATYPE-TSQUERY
   */
  TSQUERY: "tsquery",
  /**
   * text search document
   *
   * @see https://www.postgresql.org/docs/current/datatype-textsearch.html#DATATYPE-TSVECTOR
   */
  TSVECTOR: "tsvector",
  /**
   * user-level transaction ID snapshot
   *
   * @deprecated see `PG_SNAPSHOT`
   */
  TXID_SNAPSHOT: "txid_snapshot",
  /**
   * universally unique identifier
   *
   * @see https://www.postgresql.org/docs/current/datatype-uuid.html#DATATYPE-UUID
   */
  UUID: "uuid",
  /**
   * XML data
   *
   * @see https://www.postgresql.org/docs/current/datatype-xml.html#DATATYPE-XML
   */
  XML: "xml"
});

// src/runner.ts
import { extname as extname2 } from "path";

// src/db.ts
import { inspect } from "util";
import pg from "pg";
function db(connection, logger = console) {
  const isExternalClient = typeof connection === "object" && "query" in connection && typeof connection.query === "function";
  const client = isExternalClient ? connection : new pg.Client(connection);
  let connectionStatus = isExternalClient ? "EXTERNAL" : "DISCONNECTED";
  const beforeCloseListeners = [];
  const connected = () => connectionStatus === "CONNECTED" || connectionStatus === "EXTERNAL";
  const createConnection = () => new Promise((resolve2, reject) => {
    if (connected()) {
      resolve2();
    } else if (connectionStatus === "ERROR") {
      reject(
        new Error("Connection already failed, do not try to connect again")
      );
    } else {
      client.connect((err) => {
        if (err) {
          connectionStatus = "ERROR";
          logger.error(`could not connect to postgres: ${inspect(err)}`);
          reject(err);
          return;
        }
        connectionStatus = "CONNECTED";
        resolve2();
      });
    }
  });
  const query = async (queryTextOrConfig, values) => {
    await createConnection();
    try {
      return await client.query(queryTextOrConfig, values);
    } catch (error) {
      const { message, position } = error;
      const string = typeof queryTextOrConfig === "string" ? queryTextOrConfig : queryTextOrConfig.text;
      if (message && position >= 1) {
        const endLineWrapIndexOf = string.indexOf("\n", position);
        const endLineWrapPos = endLineWrapIndexOf >= 0 ? endLineWrapIndexOf : string.length;
        const stringStart = string.slice(0, endLineWrapPos);
        const stringEnd = string.slice(endLineWrapPos);
        const startLineWrapPos = stringStart.lastIndexOf("\n") + 1;
        const padding = " ".repeat(position - startLineWrapPos - 1);
        logger.error(`Error executing:
${stringStart}
${padding}^^^^${stringEnd}

${message}
`);
      } else {
        logger.error(`Error executing:
${string}
${error}
`);
      }
      throw error;
    }
  };
  const select = async (queryTextOrConfig, values) => {
    const { rows } = await query(queryTextOrConfig, values);
    return rows;
  };
  const column = async (columnName, queryTextOrConfig, values) => {
    const rows = await select(queryTextOrConfig, values);
    return rows.map((r) => r[columnName]);
  };
  return {
    createConnection,
    query,
    select,
    column,
    connected,
    addBeforeCloseListener: (listener) => beforeCloseListeners.push(listener),
    close: async () => {
      await beforeCloseListeners.reduce(
        (promise, listener) => promise.then(listener).catch((error) => {
          logger.error(error.stack || error);
        }),
        Promise.resolve()
      );
      if (!isExternalClient) {
        connectionStatus = "DISCONNECTED";
        client.end();
      }
    }
  };
}

// src/sqlMigration.ts
import { readFile } from "fs/promises";
function createMigrationCommentRegex(direction) {
  return new RegExp(`^\\s*--[\\s-]*${direction}\\s+migration`, "im");
}
function getActions(content) {
  const upMigrationCommentRegex = createMigrationCommentRegex("up");
  const downMigrationCommentRegex = createMigrationCommentRegex("down");
  const upMigrationStart = content.search(upMigrationCommentRegex);
  const downMigrationStart = content.search(downMigrationCommentRegex);
  const upSql = upMigrationStart >= 0 ? content.slice(
    upMigrationStart,
    downMigrationStart < upMigrationStart ? void 0 : downMigrationStart
  ) : content;
  const downSql = downMigrationStart >= 0 ? content.slice(
    downMigrationStart,
    upMigrationStart < downMigrationStart ? void 0 : upMigrationStart
  ) : void 0;
  return {
    up: (pgm) => {
      pgm.sql(upSql);
    },
    down: downSql === void 0 ? false : (pgm) => {
      pgm.sql(downSql);
    }
  };
}
async function sqlMigration(sqlPath) {
  const content = await readFile(sqlPath, "utf8");
  return getActions(content);
}

// src/runner.ts
var PG_MIGRATE_LOCK_ID = 7241865325823964;
var idColumn = "id";
var nameColumn = "name";
var runOnColumn = "run_on";
async function loadMigrations(db2, options, logger) {
  try {
    let shorthands = {};
    const absoluteFilePaths = await getMigrationFilePaths(options.dir, {
      ignorePattern: options.ignorePattern,
      useGlob: options.useGlob,
      logger
    });
    const migrations = await Promise.all(
      absoluteFilePaths.map(async (filePath) => {
        const actions = extname2(filePath) === ".sql" ? await sqlMigration(filePath) : await import(`file://${filePath}`);
        shorthands = { ...shorthands, ...actions.shorthands };
        return new Migration(
          db2,
          filePath,
          actions,
          options,
          {
            ...shorthands
          },
          logger
        );
      })
    );
    return migrations;
  } catch (error) {
    throw new Error(`Can't get migration files: ${error.stack}`);
  }
}
async function lock(db2, lockValue = PG_MIGRATE_LOCK_ID) {
  const [result] = await db2.select(
    `SELECT pg_try_advisory_lock(${lockValue}) AS "lockObtained"`
  );
  if (!result.lockObtained) {
    throw new Error("Another migration is already running");
  }
}
async function unlock(db2, lockValue = PG_MIGRATE_LOCK_ID) {
  const [result] = await db2.select(
    `SELECT pg_advisory_unlock(${lockValue}) AS "lockReleased"`
  );
  if (!result.lockReleased) {
    throw new Error("Failed to release migration lock");
  }
}
async function ensureMigrationsTable(db2, options) {
  try {
    const schema = getMigrationTableSchema(options);
    const { migrationsTable } = options;
    const fullTableName = createSchemalize({
      shouldDecamelize: Boolean(options.decamelize),
      shouldQuote: true
    })({
      schema,
      name: migrationsTable
    });
    const migrationTables = await db2.select(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${migrationsTable}'`
    );
    if (migrationTables && migrationTables.length === 1) {
      const primaryKeyConstraints = await db2.select(
        `SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = '${schema}' AND table_name = '${migrationsTable}' AND constraint_type = 'PRIMARY KEY'`
      );
      if (!primaryKeyConstraints || primaryKeyConstraints.length !== 1) {
        await db2.query(
          `ALTER TABLE ${fullTableName} ADD PRIMARY KEY (${idColumn})`
        );
      }
    } else {
      await db2.query(
        `CREATE TABLE ${fullTableName} (${idColumn} SERIAL PRIMARY KEY, ${nameColumn} varchar(255) NOT NULL, ${runOnColumn} timestamp NOT NULL)`
      );
    }
  } catch (error) {
    throw new Error(`Unable to ensure migrations table: ${error.stack}`);
  }
}
async function getRunMigrations(db2, options) {
  const schema = getMigrationTableSchema(options);
  const { migrationsTable } = options;
  const fullTableName = createSchemalize({
    shouldDecamelize: Boolean(options.decamelize),
    shouldQuote: true
  })({
    schema,
    name: migrationsTable
  });
  return db2.column(
    nameColumn,
    `SELECT ${nameColumn} FROM ${fullTableName} ORDER BY ${runOnColumn}, ${idColumn}`
  );
}
function getMigrationsToRun(options, runNames, migrations) {
  if (options.direction === "down") {
    const downMigrations = runNames.filter(
      (migrationName) => !options.file || options.file === migrationName
    ).map(
      (migrationName) => migrations.find(({ name }) => name === migrationName) || migrationName
    );
    const { count: count2 = 1 } = options;
    const toRun = (options.timestamp ? downMigrations.filter(
      (migration) => typeof migration === "object" && migration.timestamp >= count2
    ) : downMigrations.slice(-Math.abs(count2))).reverse();
    const deletedMigrations = toRun.filter(
      (migration) => typeof migration === "string"
    );
    if (deletedMigrations.length > 0) {
      const deletedMigrationsStr = deletedMigrations.join(", ");
      throw new Error(
        `Definitions of migrations ${deletedMigrationsStr} have been deleted.`
      );
    }
    return toRun;
  }
  const upMigrations = migrations.filter(
    ({ name }) => !runNames.includes(name) && (!options.file || options.file === name)
  );
  const { count = Number.POSITIVE_INFINITY } = options;
  return options.timestamp ? upMigrations.filter(({ timestamp }) => timestamp <= count) : upMigrations.slice(0, Math.abs(count));
}
function checkOrder(runNames, migrations) {
  const len = Math.min(runNames.length, migrations.length);
  for (let i = 0; i < len; i += 1) {
    const runName = runNames[i];
    const migrationName = migrations[i].name;
    if (runName !== migrationName) {
      throw new Error(
        `Not run migration ${migrationName} is preceding already run migration ${runName}`
      );
    }
  }
}
function runMigrations(toRun, method, direction) {
  return toRun.reduce(
    (promise, migration) => promise.then(() => migration[method](direction)),
    Promise.resolve()
  );
}
function getLogger(options) {
  const { log, logger, verbose } = options;
  let loggerObject = console;
  if (typeof logger === "object") {
    loggerObject = logger;
  } else if (typeof log === "function") {
    loggerObject = {
      debug: log,
      info: log,
      warn: log,
      error: log
    };
  }
  return verbose ? loggerObject : {
    debug: void 0,
    info: loggerObject.info.bind(loggerObject),
    warn: loggerObject.warn.bind(loggerObject),
    error: loggerObject.error.bind(loggerObject)
  };
}
async function runner(options) {
  const logger = getLogger(options);
  const connection = options.dbClient || options.databaseUrl;
  if (connection == null) {
    throw new Error("You must provide either a databaseUrl or a dbClient");
  }
  const db2 = db(connection, logger);
  try {
    await db2.createConnection();
    if (!options.noLock) {
      await lock(db2, options.lockValue);
    }
    if (options.schema) {
      const schemas = getSchemas(options.schema);
      if (options.createSchema) {
        await Promise.all(
          schemas.map(
            (schema) => db2.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
          )
        );
      }
      await db2.query(
        `SET search_path TO ${schemas.map((s) => `"${s}"`).join(", ")}`
      );
    }
    if (options.migrationsSchema && options.createMigrationsSchema) {
      await db2.query(
        `CREATE SCHEMA IF NOT EXISTS "${options.migrationsSchema}"`
      );
    }
    await ensureMigrationsTable(db2, options);
    const [migrations, runNames] = await Promise.all([
      loadMigrations(db2, options, logger),
      getRunMigrations(db2, options)
    ]);
    if (options.checkOrder !== false) {
      checkOrder(runNames, migrations);
    }
    const toRun = getMigrationsToRun(
      options,
      runNames,
      migrations
    );
    if (toRun.length === 0) {
      logger.info("No migrations to run!");
      return [];
    }
    logger.info("> Migrating files:");
    for (const m of toRun) {
      logger.info(`> - ${m.name}`);
    }
    if (options.fake) {
      await runMigrations(toRun, "markAsRun", options.direction);
    } else if (options.singleTransaction) {
      await db2.query("BEGIN");
      try {
        await runMigrations(toRun, "apply", options.direction);
        await db2.query("COMMIT");
      } catch (error) {
        logger.warn("> Rolling back attempted migration ...");
        await db2.query("ROLLBACK");
        throw error;
      }
    } else {
      await runMigrations(toRun, "apply", options.direction);
    }
    return toRun.map((m) => ({
      path: m.path,
      name: m.name,
      timestamp: m.timestamp
    }));
  } finally {
    if (db2.connected()) {
      if (!options.noLock) {
        await unlock(db2, options.lockValue).catch((error) => {
          logger.warn(error.message);
        });
      }
      await db2.close();
    }
  }
}
export {
  Migration,
  MigrationBuilder,
  PG_MIGRATE_LOCK_ID,
  PgLiteral,
  PgType,
  escapeValue,
  isPgLiteral,
  runner
};
