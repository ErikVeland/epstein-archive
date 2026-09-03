export async function up(pgm) {
  pgm.createIndex('entities', 'manually_reviewed', {
    name: 'idx_entities_reviewed_identity_lookup',
    where: 'manually_reviewed = 1',
  });
}

export async function down(pgm) {
  pgm.dropIndex('entities', 'manually_reviewed', {
    name: 'idx_entities_reviewed_identity_lookup',
  });
}
