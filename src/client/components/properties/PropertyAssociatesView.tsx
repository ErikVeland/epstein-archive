import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { formatCurrency } from '@client/utils/formatters';
import type { Property } from './types';
import styles from './PropertyAssociatesView.module.css';

interface PropertyAssociatesViewProps {
  knownAssociates: Property[];
}

export function PropertyAssociatesView({
  knownAssociates,
}: PropertyAssociatesViewProps): React.ReactElement {
  return (
    <div className={styles.associatesView}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Icon name="AlertTriangle" size="md" />
          Properties Linked to Known Associates
        </h3>
        <p className={styles.description}>
          {knownAssociates.length} properties have been flagged as potentially linked to known
          associates of Jeffrey Epstein based on name matching with entities in the archive.
        </p>
      </div>

      <div className={styles.grid}>
        {knownAssociates.map((property) => (
          <div key={property.id} className={styles.card}>
            <div className={styles.associateInfo}>
              <div className={styles.associateName}>
                <Icon name="User" size="sm" />
                {property.owner_name_1 ?? 'Unknown'}
              </div>
              {property.linked_entity_id !== null && (
                <Link to={`/entity/${property.linked_entity_id}`} className={styles.viewProfile}>
                  View Profile <Icon name="ExternalLink" size="sm" />
                </Link>
              )}
            </div>
            <div className={styles.propertyInfo}>
              <h4 className={styles.ownerHeading}>{property.owner_name_1 ?? 'Unknown Owner'}</h4>
              <p className={styles.address}>
                {property.site_address ?? property.street_name ?? 'Address N/A'}
              </p>
              <div className={styles.valueRow}>
                <span className={styles.totalValue}>
                  {formatCurrency(property.total_tax_value)}
                </span>
                <span className={styles.propertyType}>{property.property_use ?? 'N/A'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
