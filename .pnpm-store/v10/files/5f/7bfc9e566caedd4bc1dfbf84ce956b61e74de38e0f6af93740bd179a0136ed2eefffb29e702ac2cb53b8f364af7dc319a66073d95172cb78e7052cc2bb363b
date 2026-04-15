import { extname } from "node:path";
import { db as Db } from "./db.js";
import { getMigrationFilePaths, Migration } from "./migration.js";
import { sqlMigration as migrateSqlFile } from "./sqlMigration.js";
import { createSchemalize, getMigrationTableSchema, getSchemas } from "./utils.js";
const PG_MIGRATE_LOCK_ID = 7241865325823964;
const idColumn = "id";
const nameColumn = "name";
const runOnColumn = "run_on";
async function loadMigrations(db, options, logger) {
  try {
    let shorthands = {};
    const absoluteFilePaths = await getMigrationFilePaths(options.dir, {
      ignorePattern: options.ignorePattern,
      useGlob: options.useGlob,
      logger
    });
    const migrations = await Promise.all(
      absoluteFilePaths.map(async (filePath) => {
        const actions = extname(filePath) === ".sql" ? await migrateSqlFile(filePath) : await import(`file://${filePath}`);
        shorthands = { ...shorthands, ...actions.shorthands };
        return new Migration(
          db,
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
async function lock(db, lockValue = PG_MIGRATE_LOCK_ID) {
  const [result] = await db.select(
    `SELECT pg_try_advisory_lock(${lockValue}) AS "lockObtained"`
  );
  if (!result.lockObtained) {
    throw new Error("Another migration is already running");
  }
}
async function unlock(db, lockValue = PG_MIGRATE_LOCK_ID) {
  const [result] = await db.select(
    `SELECT pg_advisory_unlock(${lockValue}) AS "lockReleased"`
  );
  if (!result.lockReleased) {
    throw new Error("Failed to release migration lock");
  }
}
async function ensureMigrationsTable(db, options) {
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
    const migrationTables = await db.select(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${migrationsTable}'`
    );
    if (migrationTables && migrationTables.length === 1) {
      const primaryKeyConstraints = await db.select(
        `SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = '${schema}' AND table_name = '${migrationsTable}' AND constraint_type = 'PRIMARY KEY'`
      );
      if (!primaryKeyConstraints || primaryKeyConstraints.length !== 1) {
        await db.query(
          `ALTER TABLE ${fullTableName} ADD PRIMARY KEY (${idColumn})`
        );
      }
    } else {
      await db.query(
        `CREATE TABLE ${fullTableName} (${idColumn} SERIAL PRIMARY KEY, ${nameColumn} varchar(255) NOT NULL, ${runOnColumn} timestamp NOT NULL)`
      );
    }
  } catch (error) {
    throw new Error(`Unable to ensure migrations table: ${error.stack}`);
  }
}
async function getRunMigrations(db, options) {
  const schema = getMigrationTableSchema(options);
  const { migrationsTable } = options;
  const fullTableName = createSchemalize({
    shouldDecamelize: Boolean(options.decamelize),
    shouldQuote: true
  })({
    schema,
    name: migrationsTable
  });
  return db.column(
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
  const db = Db(connection, logger);
  try {
    await db.createConnection();
    if (!options.noLock) {
      await lock(db, options.lockValue);
    }
    if (options.schema) {
      const schemas = getSchemas(options.schema);
      if (options.createSchema) {
        await Promise.all(
          schemas.map(
            (schema) => db.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
          )
        );
      }
      await db.query(
        `SET search_path TO ${schemas.map((s) => `"${s}"`).join(", ")}`
      );
    }
    if (options.migrationsSchema && options.createMigrationsSchema) {
      await db.query(
        `CREATE SCHEMA IF NOT EXISTS "${options.migrationsSchema}"`
      );
    }
    await ensureMigrationsTable(db, options);
    const [migrations, runNames] = await Promise.all([
      loadMigrations(db, options, logger),
      getRunMigrations(db, options)
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
      await db.query("BEGIN");
      try {
        await runMigrations(toRun, "apply", options.direction);
        await db.query("COMMIT");
      } catch (error) {
        logger.warn("> Rolling back attempted migration ...");
        await db.query("ROLLBACK");
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
    if (db.connected()) {
      if (!options.noLock) {
        await unlock(db, options.lockValue).catch((error) => {
          logger.warn(error.message);
        });
      }
      await db.close();
    }
  }
}
export {
  PG_MIGRATE_LOCK_ID,
  runner
};
