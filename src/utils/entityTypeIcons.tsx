/**
 * Entity Type Icon Utility
 *
 * Provides consistent icon mapping for different entity types across the application.
 */

import Icon from '../client/components/common/Icon';
import type { IconName } from '../client/components/common/Icon';

// Define the entity types
export type EntityType =
  | 'Person'
  | 'Organization'
  | 'Location'
  | 'Document'
  | 'Date'
  | 'Event'
  | 'FinancialEntity'
  | 'Law'
  | 'Topic'
  | 'Term';

// Map entity types to appropriate Lucide icons
export const ENTITY_TYPE_ICONS: Record<EntityType, string> = {
  Person: 'User',
  Organization: 'Building2',
  Location: 'MapPin',
  Document: 'FileText',
  Event: 'Calendar',
  Law: 'Scale',
  Topic: 'Hash',
  Term: 'Key',
  Date: 'Calendar',
  FinancialEntity: 'DollarSign',
};

/**
 * Get the appropriate icon name for an entity type
 */
/**
 * Get the appropriate icon name for an entity type and optional role
 */
export function getEntityTypeIconName(entityType: string, role?: string): string {
  // Normalize the entity type to match our keys
  const normalizedType = (entityType.charAt(0).toUpperCase() + entityType.slice(1)) as EntityType;

  // Specific Role Overrides
  if (role) {
    const r = role.toLowerCase();
    if (r.includes('bank') || r.includes('investment') || r.includes('financial'))
      return 'Landmark';
    if (r.includes('store') || r.includes('shop')) return 'Store';
    if (r.includes('lawyer') || r.includes('attorney')) return 'Scale';
    if (r.includes('judge')) return 'Gavel';
  }

  // Return the icon name if it exists, otherwise default to User
  return ENTITY_TYPE_ICONS[normalizedType] || 'User';
}

/**
 * Get the Icon component for an entity type
 */
export function getEntityTypeIcon(
  entityType: string,
  size: 'sm' | 'md' | 'lg' = 'md',
  role?: string,
) {
  const iconName = getEntityTypeIconName(entityType, role);
  return <Icon name={iconName as IconName} size={size} />;
}
