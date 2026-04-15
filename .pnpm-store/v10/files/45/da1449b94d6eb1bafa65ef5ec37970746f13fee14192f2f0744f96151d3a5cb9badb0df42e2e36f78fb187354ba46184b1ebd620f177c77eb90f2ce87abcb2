function formatLines(lines, replace = "  ", separator = ",") {
  return lines.map((line) => line.replace(/(?:\r\n|\r|\n)+/g, " ")).join(`${separator}
`).replace(/^/gm, replace);
}
export {
  formatLines
};
