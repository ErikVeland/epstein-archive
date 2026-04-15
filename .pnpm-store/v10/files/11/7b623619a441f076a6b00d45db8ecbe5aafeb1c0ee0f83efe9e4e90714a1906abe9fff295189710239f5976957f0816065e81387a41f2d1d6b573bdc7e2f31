import { isPgLiteral, StringIdGenerator } from ".";
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
export {
  escapeValue
};
