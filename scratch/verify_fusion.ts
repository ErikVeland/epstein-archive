import { IdentityFusionService } from '../src/server/services/IdentityFusionService.js';
import { ForensicSignalService } from '../src/server/services/ForensicSignalService.js';
import { initPools, drainPools } from '../src/server/db/connection.js';

async function verifyFusion() {
  console.log('🔗 [CER] Initializing Identity Fusion Pass...');
  await initPools();

  try {
    const flightCount = await IdentityFusionService.fuseFlightPassengers();
    console.log(`✅ [CER] Linked ${flightCount} flight passengers.`);

    const emailCount = await IdentityFusionService.fuseEmailParticipants();
    console.log(`✅ [CER] Linked ${emailCount} email participants.`);

    const faceCount = await IdentityFusionService.fuseFaceClusters();
    console.log(`✅ [CER] Linked ${faceCount} face clusters.`);

    console.log('\n📊 [GRAPH] Retrying Signal Generation on enriched data...');
    const travelCount = await ForensicSignalService.extractCoTravelSignals();
    console.log(`📈 [SIGNAL] Created ${travelCount} Co-Travel signals.`);

    const presenceCount = await ForensicSignalService.extractCoPresenceSignals();
    console.log(`📈 [SIGNAL] Created ${presenceCount} Co-Presence signals.`);

    const promotionCount = await ForensicSignalService.promoteHighConfidenceSignals(0.0); // Promote ALL for verification
    console.log(`🚀 [RELATION] Promoted ${promotionCount} signals to relationships.`);
  } catch (error) {
    console.error('❌ [CER] Fusion failed:', error);
  } finally {
    await drainPools();
    console.log('🏁 [CER] Done.');
  }
}

verifyFusion().catch(console.error);
