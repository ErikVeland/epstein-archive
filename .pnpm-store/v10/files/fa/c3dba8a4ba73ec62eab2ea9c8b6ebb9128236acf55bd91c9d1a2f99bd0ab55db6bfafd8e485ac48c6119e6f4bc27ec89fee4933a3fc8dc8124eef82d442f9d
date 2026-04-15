function dropDomain(mOptions) {
  const _drop = (domainName, options = {}) => {
    const { ifExists = false, cascade = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const cascadeStr = cascade ? " CASCADE" : "";
    const domainNameStr = mOptions.literal(domainName);
    return `DROP DOMAIN${ifExistsStr} ${domainNameStr}${cascadeStr};`;
  };
  return _drop;
}
export {
  dropDomain
};
