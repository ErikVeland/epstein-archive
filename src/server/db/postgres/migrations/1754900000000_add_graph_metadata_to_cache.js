/* eslint-disable no-undef */

export async function up(pgm) {
  pgm.addColumns('entity_adjacency', {
    risk_score: { type: 'real', default: 0 },
    confidence: { type: 'real', default: 1 },
  });
}

export async function down(pgm) {
  pgm.dropColumns('entity_adjacency', ['risk_score', 'confidence']);
}
