import { InvestigationIngestorService } from '../src/server/services/InvestigationIngestorService.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
  const file = process.argv[2];
  const ownerId = process.argv[3] || 'user-1';

  if (!file) {
    console.error('Usage: npx tsx scripts/ingest-investigation.ts <path/to/report.md> [ownerId]');
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), file);

  try {
    console.log(`🚀 Ingesting investigation from: ${file}`);
    const result = await InvestigationIngestorService.ingestFromFile(absolutePath, ownerId);

    console.log('\n✅ Investigation Ingestion Complete');
    console.log('-----------------------------------');
    console.log(`ID: ${result.investigationId}`);
    console.log(`Evidence Linked: ${result.addedEvidence}`);
    console.log(`Timeline Events: ${result.addedTimelineEvents}`);
    console.log(`Hypotheses Identified: ${result.addedHypotheses}`);
    console.log('-----------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ingestion Error:', err);
    process.exit(1);
  }
}

main();
