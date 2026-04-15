function dataClause(data) {
  return data === void 0 ? "" : ` WITH${data ? "" : " NO"} DATA`;
}
function storageParameterStr(storageParameters) {
  return (key) => {
    const value = storageParameters[key] === true ? "" : ` = ${storageParameters[key]}`;
    return `${key}${value}`;
  };
}
export {
  dataClause,
  storageParameterStr
};
