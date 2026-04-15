import { escapeValue, toArray } from "../../utils.js";
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
export {
  formatRoleOptions
};
