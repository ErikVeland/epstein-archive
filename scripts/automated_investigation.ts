import { initPools, drainPools } from '../src/server/db/connection.js';
import { ForensicSignalService } from '../src/server/services/ForensicSignalService.js';

async function runAutonomousInvestigation() {
  console.log('\n[FORENSIC SIGNALS] Starting relational signal extraction cycle...');
  await initPools();

  try {
    console.log('[STEP 1] Extracting relational signals...');
    const travelSignals = await ForensicSignalService.extractCoTravelSignals();
    const presenceSignals = await ForensicSignalService.extractCoPresenceSignals();
    console.log(`Extracted ${travelSignals} co-travel and ${presenceSignals} co-presence signals.`);

    console.log('[STEP 2] Promoting high-confidence signals to the relationship graph...');
    const relCount = await ForensicSignalService.promoteHighConfidenceSignals(0.1);
    console.log(`Promoted ${relCount} signals to formal relationships.`);

    console.log('\n[FORENSIC SIGNALS] Cycle complete.');
  } catch (error) {
    console.error('[FORENSIC SIGNALS] Investigation cycle failed:', error);
  } finally {
    await drainPools();
  }
}

runAutonomousInvestigation().catch(console.error);
