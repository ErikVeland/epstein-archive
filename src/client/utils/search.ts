import Fuse from 'fuse.js';
import { Person, Evidence, SearchFilters } from '@client/types';

const searchOptions = {
  keys: [
    'fullName',
    'primaryRole',
    'secondaryRoles',
    'keyEvidence',
    'currentStatus',
    'connectionsToEpstein',
  ],
  threshold: 0.3,
  includeScore: true,
};

export function searchPeople(
  people: Person[],
  searchTerm: string,
  filters: SearchFilters,
): Person[] {
  let filtered = people;

  // Apply text search
  if (searchTerm) {
    const fuse = new Fuse(people, searchOptions);
    const results = fuse.search(searchTerm);
    filtered = results.map((result) => result.item);
  }

  // Apply filters
  if (filters.likelihood !== 'all') {
    filtered = filtered.filter((person) => person.likelihoodScore === filters.likelihood);
  }

  if (filters.role !== 'all') {
    filtered = filtered.filter((person) =>
      person.evidenceTypes?.some((type) =>
        type.toLowerCase().includes(filters.role?.toLowerCase() || ''),
      ),
    );
  }

  if (filters.status !== 'all') {
    filtered = filtered.filter((person) =>
      person.status?.toLowerCase().includes(filters.status?.toLowerCase() || ''),
    );
  }

  if (filters.minMentions && filters.minMentions > 0) {
    filtered = filtered.filter((person) => person.mentions >= (filters.minMentions || 0));
  }

  // Sort by mentions (descending)
  return filtered.sort((a, b) => b.mentions - a.mentions);
}

export async function getEvidenceByPerson(personName: string): Promise<Evidence[]> {
  try {
    const response = await fetch(`/data/evidence/${encodeURIComponent(personName)}.json`);
    if (!response.ok) throw new Error('Evidence not found');
    return await response.json();
  } catch (error) {
    console.error('Error loading evidence:', error);
    return [];
  }
}

export function getRoleCategories(people: Person[]): string[] {
  const roles = new Set<string>();
  people.forEach((person) => {
    if (person.evidenceTypes?.[0]) roles.add(person.evidenceTypes[0]);
    person.evidenceTypes?.slice(1).forEach((role) => roles.add(role));
  });
  return Array.from(roles).sort();
}

export function getStatusCategories(people: Person[]): string[] {
  const statuses = new Set<string>();
  people.forEach((person) => {
    if (person.likelihoodScore) {
      statuses.add(person.likelihoodScore);
    }
  });
  return Array.from(statuses).sort();
}

export function getLikelihoodColor(level: string): string {
  switch (level) {
    case 'HIGH':
      return 'text-[var(--accent-danger)] bg-[var(--accent-danger)]/20 border-[var(--accent-danger)]';
    case 'MEDIUM':
      return 'text-[var(--accent-warning)] bg-[var(--accent-warning)]/20 border-[var(--accent-warning)]';
    case 'LOW':
      return 'text-[var(--accent-success)] bg-[var(--accent-success)]/20 border-[var(--accent-success)]';
    default:
      return 'text-[var(--text-muted)] bg-[var(--glass-border)]/20 border-[var(--glass-border)]';
  }
}

export function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}
