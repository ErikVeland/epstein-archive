import { applyType } from "../../utils.js";
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
export {
  parseSequenceOptions
};
