import * as casts from "./operations/casts.js";
import * as domains from "./operations/domains.js";
import * as extensions from "./operations/extensions.js";
import * as functions from "./operations/functions.js";
import * as grants from "./operations/grants.js";
import * as indexes from "./operations/indexes.js";
import * as mViews from "./operations/materializedViews.js";
import * as operators from "./operations/operators.js";
import * as policies from "./operations/policies.js";
import * as roles from "./operations/roles.js";
import * as schemas from "./operations/schemas.js";
import * as sequences from "./operations/sequences.js";
import * as sql from "./operations/sql.js";
import * as tables from "./operations/tables.js";
import * as triggers from "./operations/triggers.js";
import * as types from "./operations/types.js";
import * as views from "./operations/views.js";
import { createSchemalize } from "./utils.js";
import { PgLiteral } from "./utils/PgLiteral.js";
class MigrationBuilder {
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
  constructor(db, typeShorthands, shouldDecamelize, logger) {
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
    this.createExtension = wrap(extensions.createExtension(options));
    this.dropExtension = wrap(extensions.dropExtension(options));
    this.addExtension = this.createExtension;
    this.createTable = wrap(tables.createTable(options));
    this.dropTable = wrap(tables.dropTable(options));
    this.renameTable = wrap(tables.renameTable(options));
    this.alterTable = wrap(tables.alterTable(options));
    this.addColumns = wrap(tables.addColumns(options));
    this.dropColumns = wrap(tables.dropColumns(options));
    this.renameColumn = wrap(tables.renameColumn(options));
    this.alterColumn = wrap(tables.alterColumn(options));
    this.addColumn = this.addColumns;
    this.dropColumn = this.dropColumns;
    this.addConstraint = wrap(tables.addConstraint(options));
    this.dropConstraint = wrap(tables.dropConstraint(options));
    this.renameConstraint = wrap(tables.renameConstraint(options));
    this.createConstraint = this.addConstraint;
    this.createType = wrap(types.createType(options));
    this.dropType = wrap(types.dropType(options));
    this.addType = this.createType;
    this.renameType = wrap(types.renameType(options));
    this.renameTypeAttribute = wrap(types.renameTypeAttribute(options));
    this.renameTypeValue = wrap(types.renameTypeValue(options));
    this.addTypeAttribute = wrap(types.addTypeAttribute(options));
    this.dropTypeAttribute = wrap(types.dropTypeAttribute(options));
    this.setTypeAttribute = wrap(types.setTypeAttribute(options));
    this.addTypeValue = wrap(types.addTypeValue(options));
    this.createIndex = wrap(indexes.createIndex(options));
    this.dropIndex = wrap(indexes.dropIndex(options));
    this.addIndex = this.createIndex;
    this.createRole = wrap(roles.createRole(options));
    this.dropRole = wrap(roles.dropRole(options));
    this.alterRole = wrap(roles.alterRole(options));
    this.renameRole = wrap(roles.renameRole(options));
    this.createFunction = wrap(functions.createFunction(options));
    this.dropFunction = wrap(functions.dropFunction(options));
    this.renameFunction = wrap(functions.renameFunction(options));
    this.createTrigger = wrap(triggers.createTrigger(options));
    this.dropTrigger = wrap(triggers.dropTrigger(options));
    this.renameTrigger = wrap(triggers.renameTrigger(options));
    this.createSchema = wrap(schemas.createSchema(options));
    this.dropSchema = wrap(schemas.dropSchema(options));
    this.renameSchema = wrap(schemas.renameSchema(options));
    this.createDomain = wrap(domains.createDomain(options));
    this.dropDomain = wrap(domains.dropDomain(options));
    this.alterDomain = wrap(domains.alterDomain(options));
    this.renameDomain = wrap(domains.renameDomain(options));
    this.createSequence = wrap(sequences.createSequence(options));
    this.dropSequence = wrap(sequences.dropSequence(options));
    this.alterSequence = wrap(sequences.alterSequence(options));
    this.renameSequence = wrap(sequences.renameSequence(options));
    this.createOperator = wrap(operators.createOperator(options));
    this.dropOperator = wrap(operators.dropOperator(options));
    this.createOperatorClass = wrap(operators.createOperatorClass(options));
    this.dropOperatorClass = wrap(operators.dropOperatorClass(options));
    this.renameOperatorClass = wrap(operators.renameOperatorClass(options));
    this.createOperatorFamily = wrap(operators.createOperatorFamily(options));
    this.dropOperatorFamily = wrap(operators.dropOperatorFamily(options));
    this.renameOperatorFamily = wrap(operators.renameOperatorFamily(options));
    this.addToOperatorFamily = wrap(operators.addToOperatorFamily(options));
    this.removeFromOperatorFamily = wrap(
      operators.removeFromOperatorFamily(options)
    );
    this.createPolicy = wrap(policies.createPolicy(options));
    this.dropPolicy = wrap(policies.dropPolicy(options));
    this.alterPolicy = wrap(policies.alterPolicy(options));
    this.renamePolicy = wrap(policies.renamePolicy(options));
    this.createView = wrap(views.createView(options));
    this.dropView = wrap(views.dropView(options));
    this.alterView = wrap(views.alterView(options));
    this.alterViewColumn = wrap(views.alterViewColumn(options));
    this.renameView = wrap(views.renameView(options));
    this.createMaterializedView = wrap(mViews.createMaterializedView(options));
    this.dropMaterializedView = wrap(mViews.dropMaterializedView(options));
    this.alterMaterializedView = wrap(mViews.alterMaterializedView(options));
    this.renameMaterializedView = wrap(mViews.renameMaterializedView(options));
    this.renameMaterializedViewColumn = wrap(
      mViews.renameMaterializedViewColumn(options)
    );
    this.refreshMaterializedView = wrap(
      mViews.refreshMaterializedView(options)
    );
    this.grantRoles = wrap(grants.grantRoles(options));
    this.revokeRoles = wrap(grants.revokeRoles(options));
    this.grantOnSchemas = wrap(grants.grantOnSchemas(options));
    this.revokeOnSchemas = wrap(grants.revokeOnSchemas(options));
    this.grantOnTables = wrap(grants.grantOnTables(options));
    this.revokeOnTables = wrap(grants.revokeOnTables(options));
    this.createCast = wrap(casts.createCast(options));
    this.dropCast = wrap(casts.dropCast(options));
    this.sql = wrap(sql.sql(options));
    this.func = PgLiteral.create;
    const wrapDB = (operation) => (...args) => {
      if (this._REVERSE_MODE) {
        throw new Error("Impossible to automatically infer down migration");
      }
      return operation(...args);
    };
    this.db = {
      query: wrapDB(db.query),
      select: wrapDB(db.select)
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
}
export {
  MigrationBuilder
};
