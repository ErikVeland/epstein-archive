/**
 * Entity Category Icon Configuration
 *
 * Maps entity categories to Lucide React icon identifiers for consistent
 * UI representation across evidence viewers, investigation tool, and search results.
 */

export type EntityCategory =
  | 'person_high_profile'
  | 'person_victim'
  | 'person_associate'
  | 'organization'
  | 'location'
  | 'aircraft'
  | 'event'
  | 'financial_entity'
  | 'legal_case';

export interface EntityCategoryConfig {
  icon: string; // Lucide icon name
  label: string;
  description: string;
  color: string; // Tailwind color class
}

export const ENTITY_CATEGORY_ICONS: Record<EntityCategory, EntityCategoryConfig> = {
  person_high_profile: {
    icon: 'UserCircle',
    label: 'High Profile Person',
    description: 'Politicians, celebrities, executives',
    color: 'text-[var(--accent)]',
  },
  person_victim: {
    icon: 'ShieldAlert',
    label: 'Victim',
    description: 'Identified or alleged victims',
    color: 'text-[var(--accent-danger)]',
  },
  person_associate: {
    icon: 'Users',
    label: 'Associate',
    description: 'Known associates, staff, pilots',
    color: 'text-[var(--accent)]',
  },
  organization: {
    icon: 'Building',
    label: 'Organization',
    description: 'Companies, foundations, institutions',
    color: 'text-[var(--text-muted)]',
  },
  location: {
    icon: 'MapPin',
    label: 'Location',
    description: 'Properties, travel destinations',
    color: 'text-[var(--accent-success)]',
  },
  aircraft: {
    icon: 'Plane',
    label: 'Aircraft',
    description: 'Private jets and flight identifiers',
    color: 'text-[var(--accent)]',
  },
  event: {
    icon: 'Calendar',
    label: 'Event',
    description: 'Specific incidents, meetings, trips',
    color: 'text-[var(--accent-warning)]',
  },
  financial_entity: {
    icon: 'DollarSign',
    label: 'Financial Entity',
    description: 'Bank accounts, transactions',
    color: 'text-[var(--accent-success)]',
  },
  legal_case: {
    icon: 'Gavel',
    label: 'Legal Case',
    description: 'Court cases and proceedings',
    color: 'text-[var(--accent-warning)]',
  },
};

/**
 * Get icon config for an entity category
 */
export function getEntityCategoryIcon(category: string): EntityCategoryConfig {
  return (
    ENTITY_CATEGORY_ICONS[category as EntityCategory] || ENTITY_CATEGORY_ICONS.person_associate
  );
}

/**
 * Map role to category (for cases where role infers category)
 */
export function roleToCategoryHint(role: string): EntityCategory | null {
  const roleLower = role.toLowerCase();

  if (roleLower.includes('victim') || roleLower.includes('plaintiff')) {
    return 'person_victim';
  }
  if (
    roleLower.includes('passenger') ||
    roleLower.includes('pilot') ||
    roleLower.includes('crew')
  ) {
    return 'person_associate';
  }
  if (roleLower.includes('organization') || roleLower.includes('company')) {
    return 'organization';
  }
  if (roleLower.includes('location') || roleLower.includes('destination')) {
    return 'location';
  }
  if (roleLower.includes('aircraft')) {
    return 'aircraft';
  }

  return null;
}
