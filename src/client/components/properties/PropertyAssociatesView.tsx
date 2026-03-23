import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { formatCurrency } from '@client/utils/formatters';
import type { Property } from './types';

interface PropertyAssociatesViewProps {
  knownAssociates: Property[];
}

export function PropertyAssociatesView({
  knownAssociates,
}: PropertyAssociatesViewProps): React.ReactElement {
  return (
    <div className="associates-view">
      <div className="associates-header">
        <h3>
          <Icon name="AlertTriangle" size="md" />
          Properties Linked to Known Associates
        </h3>
        <p className="associates-description">
          {knownAssociates.length} properties have been flagged as potentially linked to known
          associates of Jeffrey Epstein based on name matching with entities in the archive.
        </p>
      </div>

      <div className="associates-grid">
        {knownAssociates.map((property) => (
          <div key={property.id} className="associate-property-card">
            <div className="associate-info">
              <div className="associate-name">
                <Icon name="User" size="sm" />
                {property.owner_name_1 ?? 'Unknown'}
              </div>
              {property.linked_entity_id !== null && (
                <Link to={`/entity/${property.linked_entity_id}`} className="view-profile-btn">
                  View Profile <Icon name="ExternalLink" size="sm" />
                </Link>
              )}
            </div>
            <div className="property-info">
              <h4>{property.owner_name_1 ?? 'Unknown Owner'}</h4>
              <p className="address">
                {property.site_address ?? property.street_name ?? 'Address N/A'}
              </p>
              <div className="value-row">
                <span className="total-value">{formatCurrency(property.total_tax_value)}</span>
                <span className="property-type">{property.property_use ?? 'N/A'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
