const REPLACEMENT = "$1_$2";
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
export {
  decamelize
};
