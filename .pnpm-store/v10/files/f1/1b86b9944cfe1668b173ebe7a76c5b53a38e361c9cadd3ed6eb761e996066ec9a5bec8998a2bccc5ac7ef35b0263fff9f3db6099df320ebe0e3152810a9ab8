import { readFile } from "node:fs/promises";
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
export {
  getActions,
  sqlMigration
};
