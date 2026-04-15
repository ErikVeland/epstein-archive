function renameSequence(mOptions) {
  const _rename = (sequenceName, newSequenceName) => {
    const sequenceNameStr = mOptions.literal(sequenceName);
    const newSequenceNameStr = mOptions.literal(newSequenceName);
    return `ALTER SEQUENCE ${sequenceNameStr} RENAME TO ${newSequenceNameStr};`;
  };
  _rename.reverse = (sequenceName, newSequenceName) => _rename(newSequenceName, sequenceName);
  return _rename;
}
export {
  renameSequence
};
