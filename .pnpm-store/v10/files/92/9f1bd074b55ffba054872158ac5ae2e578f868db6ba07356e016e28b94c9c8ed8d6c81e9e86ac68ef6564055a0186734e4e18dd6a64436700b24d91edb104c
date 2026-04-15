import { glob } from "glob";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { cwd } from "node:process";
import { MigrationBuilder } from "./migrationBuilder.js";
import { getMigrationTableSchema } from "./utils.js";
const FilenameFormat = Object.freeze({
  timestamp: "timestamp",
  utc: "utc"
});
const SEPARATOR = "_";
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
class Migration {
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
  constructor(db, migrationPath, { up, down }, options, typeShorthands, logger = console) {
    this.db = db;
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
      (promise, sql) => promise.then(() => this.options.dryRun || this.db.query(sql)),
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
}
export {
  FilenameFormat,
  Migration,
  getMigrationFilePaths,
  getNumericPrefix
};
