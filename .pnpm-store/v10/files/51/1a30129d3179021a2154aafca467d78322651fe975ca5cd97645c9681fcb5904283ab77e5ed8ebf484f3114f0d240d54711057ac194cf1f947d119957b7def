function renameDomain(mOptions) {
  const _rename = (domainName, newDomainName) => {
    const domainNameStr = mOptions.literal(domainName);
    const newDomainNameStr = mOptions.literal(newDomainName);
    return `ALTER DOMAIN ${domainNameStr} RENAME TO ${newDomainNameStr};`;
  };
  _rename.reverse = (domainName, newDomainName) => _rename(newDomainName, domainName);
  return _rename;
}
export {
  renameDomain
};
