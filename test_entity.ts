import { entitiesRepository } from './src/server/db/entitiesRepository.js';
async function run() {
  try {
    const res = await entitiesRepository.getEntityById(1);
    console.log('Success! Entity:', res?.fullName);
  } catch (e) {
    console.error('FAILED GETTING EPSTEIN:', e);
  } finally {
    process.exit(0);
  }
}
run();
