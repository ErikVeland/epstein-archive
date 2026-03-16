import { Person } from '../types';

// Loose interface for components that might not have a full Person object
export interface PersonAdapter {
  id: number | string;
  name: string;
  files?: number;
  mentions: number;
  contexts?: any[];
  evidenceTypes?: string[];
  wasAgentic?: boolean;
  [key: string]: any;
}

export type EvidenceLadderLevel = 'L1' | 'L2' | 'L3' | 'NONE';

export interface SignalMetrics {
  exposure: number; // 0-100 (Mentions volume)
  connectivity: number; // 0-100 (Network density)
  corroboration: number; // 0-100 (Source diversity)
}

export interface DriverChip {
  label: string;
  type: 'unverified' | 'verified' | 'context' | 'critical';
  icon?: string;
}

/**
 * Calculates the Evidence Ladder Level based on direct evidence presence.
 * L1: Direct Evidence (Black Book, Flight Logs, Photos)
 * L2: Inferred (High Mentions, Network Cluster)
 * L3: Agentic/Derivative (AI Summary only)
 */
export interface EvidenceLadderResult {
  level: EvidenceLadderLevel;
  description: string;
}

/**
 * Calculates the Evidence Ladder Level based on direct evidence presence.
 * L1: Direct Evidence (Black Book, Flight Logs, Photos)
 * L2: Inferred (High Mentions, Network Cluster)
 * L3: Agentic/Derivative (AI Summary only)
 */
export const calculateEvidenceLadder = (person: Person | PersonAdapter): EvidenceLadderResult => {
  const evidenceTypes = (person.evidenceTypes || []).map((t) => t.toLowerCase());
  const hasPhotos = person.photos && person.photos.length > 0;
  const inBlackBook = person.blackBookEntries && person.blackBookEntries.length > 0;

  // L1: HARD EVIDENCE
  if (
    inBlackBook ||
    hasPhotos ||
    evidenceTypes.some((t) => t.includes('flight') || t.includes('log') || t.includes('photo'))
  ) {
    return {
      level: 'L1',
      description:
        'Changes in hard evidence detected. Direct link established via primary source documents.',
    };
  }

  // L2: STRONG INFERENCE / CORROBORATION
  if (person.mentions > 50 || (person.connections && parseInt(person.connections) > 5)) {
    return {
      level: 'L2',
      description:
        'Strong inferential patterns detected. High mention volume and network clustering.',
    };
  }

  // L3: WEAK / AGENTIC
  return {
    level: 'L3',
    description: 'Agentic correlation only. No direct evidence found in primary corpus.',
  };
};

/**
 * Derives the 3-bar signal strength metrics from person data.
 */
export const calculateSignalMetrics = (person: Person | PersonAdapter): SignalMetrics => {
  // 1. Exposure: Logarithmic scale of mentions (capped at ~1000 for 100%)
  // log10(1) = 0, log10(1000) = 3.
  const exposure = Math.min(100, (Math.log10(person.mentions + 1) / 3) * 100);

  // 2. Connectivity: Based on connections count (if string, parse it)
  let connectionCount = 0;
  if (person.connections) {
    // sometimes it's a number string, sometimes a summary string.
    // heuristic: try parse int, else count commas if valuable
    const parsed = parseInt(person.connections);
    if (!isNaN(parsed)) connectionCount = parsed;
    else connectionCount = (person.connections.match(/,/g) || []).length;
  }
  // Cap at 20 connections for max strength visual
  const connectivity = Math.min(100, (connectionCount / 20) * 100);

  // 3. Corroboration: Distinct sources.
  // We can approximate this by file count vs mentions ratio or distinct evidence types.
  // A person with 100 mentions in 1 doc = Low corroboration.
  // A person with 100 mentions in 50 docs = High corroboration.
  const docRatio =
    (person.files || 0) > 0 ? Math.min(1, (person.files || 0) / (person.mentions || 1)) : 0;
  const typeCount = (person.evidenceTypes || []).length;

  // Mix of doc diversity and evidence variety
  const corroboration = Math.min(100, typeCount * 20 + docRatio * 50);

  return { exposure, connectivity, corroboration };
};

/**
 * Generates factual "Driver Chips" derived from metadata.
 */
export const generateDriverChips = (person: Person | PersonAdapter): DriverChip[] => {
  const chips: DriverChip[] = [];
  const evidenceTypes = (person.evidenceTypes || []).map((t) => t.toLowerCase());

  if (person.blackBookEntries && person.blackBookEntries.length > 0) {
    chips.push({ label: 'Black Book Entry', type: 'critical' });
  }

  if (evidenceTypes.some((t) => t.includes('flight'))) {
    chips.push({ label: 'Flight Logs', type: 'critical' });
  }

  if (person.photos && person.photos.length > 0) {
    chips.push({ label: `${person.photos.length} Verified Photos`, type: 'verified' });
  }

  if (person.mentions > 100) {
    chips.push({ label: 'High Exposure', type: 'context' });
  }

  if (person.connections && parseInt(person.connections) > 10) {
    chips.push({ label: 'Network Hub', type: 'context' });
  }

  // Fallback for purely agentic/low-signal
  if (chips.length === 0 && person.wasAgentic) {
    chips.push({ label: 'AI Derived', type: 'unverified' });
  }

  return chips.slice(0, 3); // Max 3 chips to enforce density
};
