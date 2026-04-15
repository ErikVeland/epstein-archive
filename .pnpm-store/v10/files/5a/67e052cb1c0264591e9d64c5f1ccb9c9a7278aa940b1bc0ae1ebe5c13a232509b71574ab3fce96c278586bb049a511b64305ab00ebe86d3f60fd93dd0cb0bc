import { toArray } from "../../utils.js";
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
export {
  makeClauses
};
