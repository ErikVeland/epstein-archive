import express from 'express';
import { entityEvidenceRepository } from '../src/server/db/entityEvidenceRepository.js';
import { entitiesRepository } from '../src/server/db/entitiesRepository.js';
import { mediaRepository } from '../src/server/db/mediaRepository.js';
import { getApiPool, initPools } from '../src/server/db/connection.js';

async function simulateEndpoints() {
  process.env.PG_NUCLEAR_STRICT = '0';
  initPools();

  const entityId = '1';
  console.log('--- SIMULATING API ENDPOINTS for ID 1 ---');

  // Documents
  try {
    const page = 1;
    const limit = 50;
    const filters = { search: '', source: 'all', sort: 'date' };
    const [docs, total] = await Promise.all([
      entitiesRepository.getEntityDocumentsPaginated(entityId, page, limit, filters),
      entitiesRepository.getEntityDocumentCount(entityId, filters),
    ]);
    console.log('DOCUMENTS API: total =', total, ', count =', docs.length);
  } catch (err) {
    console.error('DOCUMENTS API FAILED:', err);
  }

  // Media
  try {
    const result = await mediaRepository.getMediaItems(entityId);
    console.log('MEDIA API: count =', result.length);
    if (result.length > 0) {
      console.log('Sample media id:', result[0].id);
    }
  } catch (err) {
    console.error('MEDIA API FAILED:', err);
  }

  process.exit(0);
}

simulateEndpoints().catch((err) => {
  console.error(err);
  process.exit(1);
});
