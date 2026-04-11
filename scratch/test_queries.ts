import { getApiPool, initPools } from '../src/server/db/connection.js';
import { entitiesRepository } from '../src/server/db/entitiesRepository.js';

async function testRepositoryQueries() {
  process.env.PG_NUCLEAR_STRICT = '0';
  initPools();
  const pool = getApiPool();

  const entityId = '1'; // Jeffrey Epstein
  const filters = { search: '', source: 'all', sort: 'date' };

  console.log('Testing getEntityDocumentCount...');
  try {
    const total = await entitiesRepository.getEntityDocumentCount(entityId, filters);
    console.log('Count result:', total);
  } catch (err) {
    console.error('Count query failed:', err);
  }

  console.log('Testing getEntityDocumentsPaginated...');
  try {
    const docs = await entitiesRepository.getEntityDocumentsPaginated(entityId, 1, 50, filters);
    console.log('Paginated results count:', docs.length);
  } catch (err) {
    console.error('Paginated query failed:', err);
  }

  console.log('Testing with search filter...');
  try {
    const total = await entitiesRepository.getEntityDocumentCount(entityId, { search: 'test' });
    console.log('Count with search:', total);
  } catch (err) {
    console.error('Count with search failed:', err);
  }

  process.exit(0);
}

testRepositoryQueries().catch((err) => {
  console.error(err);
  process.exit(1);
});
