import { DB } from './db.js';
import { Logger } from './logger.js';
import { CreateCast } from './operations/casts/createCast.js';
import { DropCast } from './operations/casts/dropCast.js';
import { AlterDomain } from './operations/domains/alterDomain.js';
import { CreateDomain } from './operations/domains/createDomain.js';
import { DropDomain } from './operations/domains/dropDomain.js';
import { RenameDomain } from './operations/domains/renameDomain.js';
import { AddColumns } from './operations/tables/addColumns.js';
import { CreateConstraint } from './operations/tables/addConstraint.js';
import { AlterColumn } from './operations/tables/alterColumn.js';
import { AlterTable } from './operations/tables/alterTable.js';
import { CreateTable } from './operations/tables/createTable.js';
import { DropColumns } from './operations/tables/dropColumns.js';
import { DropConstraint } from './operations/tables/dropConstraint.js';
import { DropTable } from './operations/tables/dropTable.js';
import { RenameColumn } from './operations/tables/renameColumn.js';
import { RenameConstraint } from './operations/tables/renameConstraint.js';
import { RenameTable } from './operations/tables/renameTable.js';
import { a as ColumnDefinitions } from './migrationOptions-BgtOZlq1.js';
import { CreateFunction } from './operations/functions/createFunction.js';
import { DropFunction } from './operations/functions/dropFunction.js';
import { RenameFunction } from './operations/functions/renameFunction.js';
import { d as PgLiteral } from './generalTypes-BlKhVJMl.js';
import { CreateExtension } from './operations/extensions/createExtension.js';
import { DropExtension } from './operations/extensions/dropExtension.js';
import { G as GrantOnSchemas, R as RevokeOnSchemas } from './grantOnSchemas-BDCuq3Qp.js';
import { GrantOnTables } from './operations/grants/grantOnTables.js';
import { GrantRoles } from './operations/grants/grantRoles.js';
import { RevokeOnTables } from './operations/grants/revokeOnTables.js';
import { RevokeRoles } from './operations/grants/revokeRoles.js';
import { CreateIndex, DropIndex } from './operations/indexes/index.js';
import { AlterMaterializedView } from './operations/materializedViews/alterMaterializedView.js';
import { CreateMaterializedView } from './operations/materializedViews/createMaterializedView.js';
import { DropMaterializedView } from './operations/materializedViews/dropMaterializedView.js';
import { RefreshMaterializedView } from './operations/materializedViews/refreshMaterializedView.js';
import { RenameMaterializedView } from './operations/materializedViews/renameMaterializedView.js';
import { RenameMaterializedViewColumn } from './operations/materializedViews/renameMaterializedViewColumn.js';
import { AddToOperatorFamily } from './operations/operators/addToOperatorFamily.js';
import { CreateOperator } from './operations/operators/createOperator.js';
import { CreateOperatorClass } from './operations/operators/createOperatorClass.js';
import { CreateOperatorFamily } from './operations/operators/createOperatorFamily.js';
import { DropOperator } from './operations/operators/dropOperator.js';
import { DropOperatorClass } from './operations/operators/dropOperatorClass.js';
import { DropOperatorFamily } from './operations/operators/dropOperatorFamily.js';
import { RemoveFromOperatorFamily } from './operations/operators/removeFromOperatorFamily.js';
import { RenameOperatorClass } from './operations/operators/renameOperatorClass.js';
import { RenameOperatorFamily } from './operations/operators/renameOperatorFamily.js';
import { AlterPolicy } from './operations/policies/alterPolicy.js';
import { CreatePolicy } from './operations/policies/createPolicy.js';
import { DropPolicy } from './operations/policies/dropPolicy.js';
import { RenamePolicy } from './operations/policies/renamePolicy.js';
import { AlterRole } from './operations/roles/alterRole.js';
import { CreateRole } from './operations/roles/createRole.js';
import { DropRole } from './operations/roles/dropRole.js';
import { RenameRole } from './operations/roles/renameRole.js';
import { CreateSchema } from './operations/schemas/createSchema.js';
import { DropSchema } from './operations/schemas/dropSchema.js';
import { RenameSchema } from './operations/schemas/renameSchema.js';
import { AlterSequence } from './operations/sequences/alterSequence.js';
import { CreateSequence } from './operations/sequences/createSequence.js';
import { DropSequence } from './operations/sequences/dropSequence.js';
import { RenameSequence } from './operations/sequences/renameSequence.js';
import { Sql } from './operations/sql.js';
import { CreateTrigger } from './operations/triggers/createTrigger.js';
import { DropTrigger } from './operations/triggers/dropTrigger.js';
import { RenameTrigger } from './operations/triggers/renameTrigger.js';
import { AddTypeAttribute } from './operations/types/addTypeAttribute.js';
import { AddTypeValue } from './operations/types/addTypeValue.js';
import { CreateType } from './operations/types/createType.js';
import { DropType } from './operations/types/dropType.js';
import { DropTypeAttribute } from './operations/types/dropTypeAttribute.js';
import { RenameType } from './operations/types/renameType.js';
import { RenameTypeAttribute } from './operations/types/renameTypeAttribute.js';
import { RenameTypeValue } from './operations/types/renameTypeValue.js';
import { SetTypeAttribute } from './operations/types/setTypeAttribute.js';
import { AlterView } from './operations/views/alterView.js';
import { AlterViewColumn } from './operations/views/alterViewColumn.js';
import { CreateView } from './operations/views/createView.js';
import { DropView } from './operations/views/dropView.js';
import { RenameView } from './operations/views/renameView.js';
import 'pg';
import './operations/domains/shared.js';
import './utils/createTransformer.js';
import './operations/functions/shared.js';
import './operations/extensions/shared.js';
import './operations/grants/shared.js';
import './operations/materializedViews/shared.js';
import './operations/operators/shared.js';
import './operations/policies/shared.js';
import './operations/roles/shared.js';
import './operations/triggers/shared.js';
import './operations/views/shared.js';

declare class MigrationBuilder {
    /**
     * Install an extension.
     *
     * @alias addExtension
     *
     * @see https://www.postgresql.org/docs/current/sql-createextension.html
     */
    readonly createExtension: (...args: Parameters<CreateExtension>) => void;
    /**
     * Remove an extension.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropextension.html
     */
    readonly dropExtension: (...args: Parameters<DropExtension>) => void;
    /**
     * Install an extension.
     *
     * @alias createExtension
     *
     * @see https://www.postgresql.org/docs/current/sql-createextension.html
     */
    readonly addExtension: (...args: Parameters<CreateExtension>) => void;
    /**
     * Define a new table.
     *
     * @see https://www.postgresql.org/docs/current/sql-createtable.html
     */
    readonly createTable: (...args: Parameters<CreateTable>) => void;
    /**
     * Remove a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-droptable.html
     */
    readonly dropTable: (...args: Parameters<DropTable>) => void;
    /**
     * Rename a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly renameTable: (...args: Parameters<RenameTable>) => void;
    /**
     * Change the definition of a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly alterTable: (...args: Parameters<AlterTable>) => void;
    /**
     * Add columns to a table.
     *
     * @alias addColumn
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly addColumns: (...args: Parameters<AddColumns>) => void;
    /**
     * Remove columns from a table.
     *
     * @alias dropColumn
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly dropColumns: (...args: Parameters<DropColumns>) => void;
    /**
     * Rename a column.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly renameColumn: (...args: Parameters<RenameColumn>) => void;
    /**
     * Change the definition of a column.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly alterColumn: (...args: Parameters<AlterColumn>) => void;
    /**
     * Add a column to a table.
     *
     * @alias addColumns
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly addColumn: (...args: Parameters<AddColumns>) => void;
    /**
     * Remove a column from a table.
     *
     * @alias dropColumns
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly dropColumn: (...args: Parameters<DropColumns>) => void;
    /**
     * Add a constraint to a table.
     *
     * @alias createConstraint
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly addConstraint: (...args: Parameters<CreateConstraint>) => void;
    /**
     * Remove a constraint from a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly dropConstraint: (...args: Parameters<DropConstraint>) => void;
    /**
     * Rename a constraint.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly renameConstraint: (...args: Parameters<RenameConstraint>) => void;
    /**
     * Add a constraint to a table.
     *
     * @alias addConstraint
     *
     * @see https://www.postgresql.org/docs/current/sql-altertable.html
     */
    readonly createConstraint: (...args: Parameters<CreateConstraint>) => void;
    /**
     * Define a new data type.
     *
     * @alias addType
     *
     * @see https://www.postgresql.org/docs/current/sql-createtype.html
     */
    readonly createType: (...args: Parameters<CreateType>) => void;
    /**
     * Remove a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-droptype.html
     */
    readonly dropType: (...args: Parameters<DropType>) => void;
    /**
     * Define a new data type.
     *
     * @alias createType
     *
     * @see https://www.postgresql.org/docs/current/sql-createtype.html
     */
    readonly addType: (...args: Parameters<CreateType>) => void;
    /**
     * Rename a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly renameType: (...args: Parameters<RenameType>) => void;
    /**
     * Rename a data type attribute.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly renameTypeAttribute: (...args: Parameters<RenameTypeAttribute>) => void;
    /**
     * Rename a data type value.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly renameTypeValue: (...args: Parameters<RenameTypeValue>) => void;
    /**
     * Add an attribute to a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly addTypeAttribute: (...args: Parameters<AddTypeAttribute>) => void;
    /**
     * Remove an attribute from a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly dropTypeAttribute: (...args: Parameters<DropTypeAttribute>) => void;
    /**
     * Set an attribute of a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly setTypeAttribute: (...args: Parameters<SetTypeAttribute>) => void;
    /**
     * Add a value to a data type.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertype.html
     */
    readonly addTypeValue: (...args: Parameters<AddTypeValue>) => void;
    /**
     * Define a new index.
     *
     * @alias addIndex
     *
     * @see https://www.postgresql.org/docs/current/sql-createindex.html
     */
    readonly createIndex: (...args: Parameters<CreateIndex>) => void;
    /**
     * Remove an index.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropindex.html
     */
    readonly dropIndex: (...args: Parameters<DropIndex>) => void;
    /**
     * Define a new index.
     *
     * @alias createIndex
     *
     * @see https://www.postgresql.org/docs/current/sql-createindex.html
     */
    readonly addIndex: (...args: Parameters<CreateIndex>) => void;
    /**
     * Define a new database role.
     *
     * @see https://www.postgresql.org/docs/current/sql-createrole.html
     */
    readonly createRole: (...args: Parameters<CreateRole>) => void;
    /**
     * Remove a database role.
     *
     * @see https://www.postgresql.org/docs/current/sql-droprole.html
     */
    readonly dropRole: (...args: Parameters<DropRole>) => void;
    /**
     * Change a database role.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterrole.html
     */
    readonly alterRole: (...args: Parameters<AlterRole>) => void;
    /**
     * Rename a database role.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterrole.html
     */
    readonly renameRole: (...args: Parameters<RenameRole>) => void;
    /**
     * Define a new function.
     *
     * @see https://www.postgresql.org/docs/current/sql-createfunction.html
     */
    readonly createFunction: (...args: Parameters<CreateFunction>) => void;
    /**
     * Remove a function.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropfunction.html
     */
    readonly dropFunction: (...args: Parameters<DropFunction>) => void;
    /**
     * Rename a function.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterfunction.html
     */
    readonly renameFunction: (...args: Parameters<RenameFunction>) => void;
    /**
     * Define a new trigger.
     *
     * @see https://www.postgresql.org/docs/current/sql-createtrigger.html
     */
    readonly createTrigger: (...args: Parameters<CreateTrigger>) => void;
    /**
     * Remove a trigger.
     *
     * @see https://www.postgresql.org/docs/current/sql-droptrigger.html
     */
    readonly dropTrigger: (...args: Parameters<DropTrigger>) => void;
    /**
     * Rename a trigger.
     *
     * @see https://www.postgresql.org/docs/current/sql-altertrigger.html
     */
    readonly renameTrigger: (...args: Parameters<RenameTrigger>) => void;
    /**
     * Define a new schema.
     *
     * @see https://www.postgresql.org/docs/current/sql-createschema.html
     */
    readonly createSchema: (...args: Parameters<CreateSchema>) => void;
    /**
     * Remove a schema.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropschema.html
     */
    readonly dropSchema: (...args: Parameters<DropSchema>) => void;
    /**
     * Rename a schema.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterschema.html
     */
    readonly renameSchema: (...args: Parameters<RenameSchema>) => void;
    /**
     * Define a new domain.
     *
     * @see https://www.postgresql.org/docs/current/sql-createdomain.html
     */
    readonly createDomain: (...args: Parameters<CreateDomain>) => void;
    /**
     * Remove a domain.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropdomain.html
     */
    readonly dropDomain: (...args: Parameters<DropDomain>) => void;
    /**
     * Change the definition of a domain.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterdomain.html
     */
    readonly alterDomain: (...args: Parameters<AlterDomain>) => void;
    /**
     * Rename a domain.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterdomain.html
     */
    readonly renameDomain: (...args: Parameters<RenameDomain>) => void;
    /**
     * Define a new sequence generator.
     *
     * @see https://www.postgresql.org/docs/current/sql-createsequence.html
     */
    readonly createSequence: (...args: Parameters<CreateSequence>) => void;
    /**
     * Remove a sequence.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropsequence.html
     */
    readonly dropSequence: (...args: Parameters<DropSequence>) => void;
    /**
     * Change the definition of a sequence generator.
     *
     * @see https://www.postgresql.org/docs/current/sql-altersequence.html
     */
    readonly alterSequence: (...args: Parameters<AlterSequence>) => void;
    /**
     * Rename a sequence.
     *
     * @see https://www.postgresql.org/docs/current/sql-altersequence.html
     */
    readonly renameSequence: (...args: Parameters<RenameSequence>) => void;
    /**
     * Define a new operator.
     *
     * @see https://www.postgresql.org/docs/current/sql-createoperator.html
     */
    readonly createOperator: (...args: Parameters<CreateOperator>) => void;
    /**
     * Remove an operator.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropoperator.html
     */
    readonly dropOperator: (...args: Parameters<DropOperator>) => void;
    /**
     * Define a new operator class.
     *
     * @see https://www.postgresql.org/docs/current/sql-createopclass.html
     */
    readonly createOperatorClass: (...args: Parameters<CreateOperatorClass>) => void;
    /**
     * Remove an operator class.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropopclass.html
     */
    readonly dropOperatorClass: (...args: Parameters<DropOperatorClass>) => void;
    /**
     * Rename an operator class.
     *
     * @see https://www.postgresql.org/docs/current/sql-alteropclass.html
     */
    readonly renameOperatorClass: (...args: Parameters<RenameOperatorClass>) => void;
    /**
     * Define a new operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-createopfamily.html
     */
    readonly createOperatorFamily: (...args: Parameters<CreateOperatorFamily>) => void;
    /**
     * Remove an operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropopfamily.html
     */
    readonly dropOperatorFamily: (...args: Parameters<DropOperatorFamily>) => void;
    /**
     * Rename an operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-alteropfamily.html
     */
    readonly renameOperatorFamily: (...args: Parameters<RenameOperatorFamily>) => void;
    /**
     * Add an operator to an operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-alteropfamily.html
     */
    readonly addToOperatorFamily: (...args: Parameters<AddToOperatorFamily>) => void;
    /**
     * Remove an operator from an operator family.
     *
     * @see https://www.postgresql.org/docs/current/sql-alteropfamily.html
     */
    readonly removeFromOperatorFamily: (...args: Parameters<RemoveFromOperatorFamily>) => void;
    /**
     * Define a new row-level security policy for a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-createpolicy.html
     */
    readonly createPolicy: (...args: Parameters<CreatePolicy>) => void;
    /**
     * Remove a row-level security policy from a table.
     *
     * @see https://www.postgresql.org/docs/current/sql-droppolicy.html
     */
    readonly dropPolicy: (...args: Parameters<DropPolicy>) => void;
    /**
     * Change the definition of a row-level security policy.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterpolicy.html
     */
    readonly alterPolicy: (...args: Parameters<AlterPolicy>) => void;
    /**
     * Rename a row-level security policy.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterpolicy.html
     */
    readonly renamePolicy: (...args: Parameters<RenamePolicy>) => void;
    /**
     * Define a new view.
     *
     * @see https://www.postgresql.org/docs/current/sql-createview.html
     */
    readonly createView: (...args: Parameters<CreateView>) => void;
    /**
     * Remove a view.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropview.html
     */
    readonly dropView: (...args: Parameters<DropView>) => void;
    /**
     * Change the definition of a view.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterview.html
     */
    readonly alterView: (...args: Parameters<AlterView>) => void;
    /**
     * Change the definition of a view column.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterview.html
     */
    readonly alterViewColumn: (...args: Parameters<AlterViewColumn>) => void;
    /**
     * Rename a view.
     *
     * @see https://www.postgresql.org/docs/current/sql-alterview.html
     */
    readonly renameView: (...args: Parameters<RenameView>) => void;
    /**
     * Define a new materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-creatematerializedview.html
     */
    readonly createMaterializedView: (...args: Parameters<CreateMaterializedView>) => void;
    /**
     * Remove a materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropmaterializedview.html
     */
    readonly dropMaterializedView: (...args: Parameters<DropMaterializedView>) => void;
    /**
     * Change the definition of a materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-altermaterializedview.html
     */
    readonly alterMaterializedView: (...args: Parameters<AlterMaterializedView>) => void;
    /**
     * Rename a materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-altermaterializedview.html
     */
    readonly renameMaterializedView: (...args: Parameters<RenameMaterializedView>) => void;
    /**
     * Rename a materialized view column.
     *
     * @see https://www.postgresql.org/docs/current/sql-altermaterializedview.html
     */
    readonly renameMaterializedViewColumn: (...args: Parameters<RenameMaterializedViewColumn>) => void;
    /**
     * Replace the contents of a materialized view.
     *
     * @see https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
     */
    readonly refreshMaterializedView: (...args: Parameters<RefreshMaterializedView>) => void;
    /**
     * Define access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-grant.html
     */
    readonly grantRoles: (...args: Parameters<GrantRoles>) => void;
    /**
     * Remove access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-revoke.html
     */
    readonly revokeRoles: (...args: Parameters<RevokeRoles>) => void;
    /**
     * Define access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-grant.html
     */
    readonly grantOnSchemas: (...args: Parameters<GrantOnSchemas>) => void;
    /**
     * Remove access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-revoke.html
     */
    readonly revokeOnSchemas: (...args: Parameters<RevokeOnSchemas>) => void;
    /**
     * Define access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-grant.html
     */
    readonly grantOnTables: (...args: Parameters<GrantOnTables>) => void;
    /**
     * Remove access privileges.
     *
     * @see https://www.postgresql.org/docs/current/sql-revoke.html
     */
    readonly revokeOnTables: (...args: Parameters<RevokeOnTables>) => void;
    /**
     * Define a new cast.
     *
     * @see https://www.postgresql.org/docs/current/sql-createcast.html
     */
    readonly createCast: (...args: Parameters<CreateCast>) => void;
    /**
     * Remove a cast.
     *
     * @see https://www.postgresql.org/docs/current/sql-dropcast.html
     */
    readonly dropCast: (...args: Parameters<DropCast>) => void;
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
    readonly sql: (...args: Parameters<Sql>) => void;
    /**
     * Inserts raw string, **which is not escaped**.
     *
     * @param sql String to **not escaped**.
     *
     * @example
     * { default: pgm.func('CURRENT_TIMESTAMP') }
     */
    readonly func: (sql: string) => PgLiteral;
    /**
     * The `db` client instance.
     *
     * Can be used to run queries directly.
     */
    readonly db: DB;
    private _steps;
    private _REVERSE_MODE;
    private _useTransaction;
    constructor(db: DB, typeShorthands: ColumnDefinitions | undefined, shouldDecamelize: boolean, logger: Logger);
    /**
     * Run the reverse of the migration. Useful for creating a new migration that
     * reverts a previous migration.
     */
    enableReverseMode(): this;
    /**
     * By default, all migrations are run in one transaction, but some DB
     * operations like add type value (`pgm.addTypeValue`) does not work if the
     * type is not created in the same transaction.
     * e.g. if it is created in previous migration. You need to run specific
     * migration outside a transaction (`pgm.noTransaction`).
     * Be aware that this means that you can have some migrations applied and some
     * not applied, if there is some error during migrating (leading to `ROLLBACK`).
     */
    noTransaction(): this;
    isUsingTransaction(): boolean;
    getSql(): string;
    getSqlSteps(): string[];
}

export { MigrationBuilder };
