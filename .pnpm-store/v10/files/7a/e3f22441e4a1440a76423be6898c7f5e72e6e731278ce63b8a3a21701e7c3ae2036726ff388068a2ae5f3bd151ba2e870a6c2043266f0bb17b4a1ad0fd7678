import { escapeValue } from ".";
function makeComment(object, name, text = null) {
  const literal = escapeValue(text);
  return `COMMENT ON ${object} ${name} IS ${literal};`;
}
export {
  makeComment
};
