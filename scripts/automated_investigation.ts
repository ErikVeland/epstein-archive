import { initPools, drainPools } from '../src/server/db/connection.js';
import { IdentityFusionService } from '../src/server/services/IdentityFusionService.js';
import { ForensicSignalService } from '../src/server/services/ForensicSignalService.js';
import { InvestigationAgentService } from '../src/server/services/InvestigationAgentService.js';

async function runAutonomousInvestigation() {
  console.log('\n🌟 [FORENSIC AGENT] Starting Autonomous Investigation Cycle...');
  await initPools();

  try {
    // 1. Identity Fusion (CER)
    console.log('🔗 [STEP 1] Running Identity Fusion Pass...');
    const fusionCount = await IdentityFusionService.fuseFlightPassengers();
    const emailCount = await IdentityFusionService.fuseEmailParticipants();
    const faceCount = await IdentityFusionService.fuseFaceClusters();
    console.log(
      `✅ Fused: ${fusionCount} Flights, ${emailCount} Emails, ${faceCount} Face Clusters.`,
    );

    // 2. Signal Generation (Extraction)
    console.log('📡 [STEP 2] Extracting Relational Signals...');
    const travelSignals = await ForensicSignalService.extractCoTravelSignals();
    const presenceSignals = await ForensicSignalService.extractCoPresenceSignals();
    console.log(
      `✅ Extracted: ${travelSignals} Co-Travel, ${presenceSignals} Co-Presence signals.`,
    );

    // 3. Signal Promotion (Relational Graph)
    console.log('📈 [STEP 3] Promoting Signals to Relational Graph...');
    const relCount = await ForensicSignalService.promoteHighConfidenceSignals(0.1); // Use low threshold for demo
    console.log(`✅ Promoted ${relCount} signals to formal relationships.`);

    // 4. Agentic Lead Generation (Intelligence)
    console.log('🤖 [STEP 4] Agentic Intelligence Pass...');
    const leadCount = await InvestigationAgentService.proposeLeadsFromSignals(0.0); // Create leads for all discovered connections
    const taskCount = await InvestigationAgentService.generateTasksForCriticalLeads();
    console.log(
      `✅ Created ${leadCount} Investigative Leads and dispatched ${taskCount} Critical Tasks.`,
    );

    console.log('\n🏆 [FORENSIC AGENT] Cycle Complete. Data relationality advanced.');
  } catch (error) {
    console.error('❌ [FORENSIC AGENT] Investigation cycle failed:', error);
  } finally {
    await drainPools();
  }
}

runAutonomousInvestigation().catch(console.error);
