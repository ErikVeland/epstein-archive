function dropRole(mOptions) {
  const _drop = (roleName, options = {}) => {
    const { ifExists = false } = options;
    const ifExistsStr = ifExists ? " IF EXISTS" : "";
    const roleNameStr = mOptions.literal(roleName);
    return `DROP ROLE${ifExistsStr} ${roleNameStr};`;
  };
  return _drop;
}
export {
  dropRole
};
