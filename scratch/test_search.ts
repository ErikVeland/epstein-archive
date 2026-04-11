import { getApiPool, initPools } from '../src/server/db/connection.js';
import { searchRepository } from '../src/server/db/searchRepository.js';

async function testSearch() {
  process.env.PG_NUCLEAR_STRICT = '0';
  initPools();
  const res = await searchRepository.search('Jeffrey Epstein', 5);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

testSearch().catch((err) => {
  console.error(err);
  process.exit(1);
});
