import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import { formatCurrency, formatNumber } from '@client/utils/formatters';
import { cn } from '@client/utils/cn';
import type { Property } from './types';
import styles from './PropertyCard.module.css';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
}

export function PropertyCard({ property, onSelect }: PropertyCardProps): React.ReactElement {
  const backLinkState = useBackLinkState();
  return (
    <div
      className={cn(styles.card, property.is_known_associate === 1 && styles.flagged)}
      onClick={() => onSelect(property)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(property)}
    >
      {property.is_known_associate === 1 && (
        <div className={styles.associateBadge}>
          <Icon name="AlertTriangle" size="sm" />
          Known Associate
        </div>
      )}
      {property.is_epstein_property === 1 && (
        <div className={cn(styles.associateBadge, styles.epsteinBadge)}>
          <Icon name="AlertTriangle" size="sm" />
          Epstein Property
        </div>
      )}
      <div className={styles.header}>
        <h4 className={styles.ownerName}>{property.owner_name_1 || 'Unknown Owner'}</h4>
        <span className={styles.propertyValue}>{formatCurrency(property.total_tax_value)}</span>
      </div>
      <div className={styles.address}>
        <Icon name="MapPin" size="sm" />
        {property.site_address || property.street_name || 'Address N/A'}
        {property.address_source === 'name_derived' && (
          <span className={styles.derivedBadge} title="Address inferred from owner name">
            ~
          </span>
        )}
      </div>
      <div className={styles.details}>
        <span>
          <strong className={styles.detailLabel}>Type:</strong> {property.property_use || 'N/A'}
        </span>
        <span>
          <strong className={styles.detailLabel}>Built:</strong> {property.year_built || 'N/A'}
        </span>
        {property.bedrooms !== null && property.bedrooms > 0 && (
          <span>
            <strong className={styles.detailLabel}>Beds:</strong> {property.bedrooms}
          </span>
        )}
        {property.full_bathrooms !== null && property.full_bathrooms > 0 && (
          <span>
            <strong className={styles.detailLabel}>Baths:</strong> {property.full_bathrooms}
          </span>
        )}
        {property.living_area !== null && property.living_area > 0 && (
          <span>
            <strong className={styles.detailLabel}>Living:</strong>{' '}
            {formatNumber(property.living_area)} sqft
          </span>
        )}
        {property.acres !== null && property.acres > 0 && (
          <span>
            <strong className={styles.detailLabel}>Acres:</strong> {property.acres.toFixed(2)}
          </span>
        )}
      </div>
      <div className={styles.valueGrid}>
        <div>
          <span className={styles.valueLabel}>Building</span>
          <span className={styles.valueText}>{formatCurrency(property.building_value)}</span>
        </div>
      </div>
      {property.is_known_associate === 1 && property.linked_entity_id !== null && (
        <Link
          to={`/entity/${property.linked_entity_id}`}
          state={backLinkState}
          className={styles.associateLink}
        >
          <Icon name="User" size="sm" />
          View Entity Profile
        </Link>
      )}
      <div className={styles.actions}>
        <AddToInvestigationButton
          item={{
            id: String(property.id),
            title: `${property.owner_name_1 ?? 'Unknown'} - ${property.site_address ?? property.street_name ?? 'Unknown Address'}`,
            description: `${property.property_use ?? 'Property'} valued at ${formatCurrency(property.total_tax_value)}${property.is_known_associate ? ' (Known Associate)' : ''}`,
            type: 'property',
            sourceId: String(property.id),
            metadata: {
              owner: property.owner_name_1,
              address: property.site_address ?? property.street_name,
              value: property.total_tax_value,
              isKnownAssociate: property.is_known_associate === 1,
              linkedEntityId: property.linked_entity_id,
            },
          }}
          variant="quick"
          className={styles.addButtonFull}
        />
      </div>
    </div>
  );
}
