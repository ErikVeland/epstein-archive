import { ForensicSignalService } from '../src/server/services/ForensicSignalService.js';
import { initPools, drainPools } from '../src/server/db/connection.js';

async function verifySignals() {
  console.log('🔍 [VERIFY] Initializing Forensic Signal Generation...');
  await initPools();

  try {
    const travelCount = await ForensicSignalService.extractCoTravelSignals();
    console.log(`✅ [VERIFY] Created ${travelCount} Co-Travel signals.`);

    const presenceCount = await ForensicSignalService.extractCoPresenceSignals();
    console.log(`✅ [VERIFY] Created ${presenceCount} Co-Presence signals.`);

    const promotionCount = await ForensicSignalService.promoteHighConfidenceSignals(0.1); // Low threshold for verify
    console.log(`✅ [VERIFY] Promoted ${promotionCount} signals to relationships.`);
  } catch (error) {
    console.error('❌ [VERIFY] Signal generation failed:', error);
  } finally {
    await drainPools();
    console.log('🏁 [VERIFY] Done.');
  }
}

verifySignals().catch(console.error);
