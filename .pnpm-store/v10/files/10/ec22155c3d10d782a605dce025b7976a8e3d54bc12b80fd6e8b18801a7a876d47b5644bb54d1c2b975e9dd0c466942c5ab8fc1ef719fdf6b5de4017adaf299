function renameRole(mOptions) {
  const _rename = (oldRoleName, newRoleName) => {
    const oldRoleNameStr = mOptions.literal(oldRoleName);
    const newRoleNameStr = mOptions.literal(newRoleName);
    return `ALTER ROLE ${oldRoleNameStr} RENAME TO ${newRoleNameStr};`;
  };
  _rename.reverse = (oldRoleName, newRoleName) => _rename(newRoleName, oldRoleName);
  return _rename;
}
export {
  renameRole
};
