import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { formatCurrency, formatNumber } from '@client/utils/formatters';
import type { Property } from './types';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps): React.ReactElement {
  return (
    <div className={`property-card ${property.is_known_associate ? 'flagged' : ''}`}>
      {property.is_known_associate === 1 && (
        <div className="associate-badge">
          <Icon name="AlertTriangle" size="sm" />
          Known Associate
        </div>
      )}
      {property.is_epstein_property === 1 && (
        <div className="associate-badge epstein">
          <Icon name="AlertTriangle" size="sm" />
          Epstein Property
        </div>
      )}
      <div className="property-header">
        <h4>{property.owner_name_1 || 'Unknown Owner'}</h4>
        <span className="property-value">{formatCurrency(property.total_tax_value)}</span>
      </div>
      <div className="property-address">
        <Icon name="MapPin" size="sm" />
        {property.site_address || property.street_name || 'Address N/A'}
      </div>
      <div className="property-details">
        <span>
          <strong>Type:</strong> {property.property_use || 'N/A'}
        </span>
        <span>
          <strong>Built:</strong> {property.year_built || 'N/A'}
        </span>
        {property.bedrooms !== null && property.bedrooms > 0 && (
          <span>
            <strong>Beds:</strong> {property.bedrooms}
          </span>
        )}
        {property.full_bathrooms !== null && property.full_bathrooms > 0 && (
          <span>
            <strong>Baths:</strong> {property.full_bathrooms}
          </span>
        )}
        {property.living_area !== null && property.living_area > 0 && (
          <span>
            <strong>Living:</strong> {formatNumber(property.living_area)} sqft
          </span>
        )}
        {property.acres !== null && property.acres > 0 && (
          <span>
            <strong>Acres:</strong> {property.acres.toFixed(2)}
          </span>
        )}
      </div>
      <div className="property-values">
        <div>
          <span className="label">Building</span>
          <span className="value">{formatCurrency(property.building_value)}</span>
        </div>
      </div>
      {property.is_known_associate === 1 && property.linked_entity_id !== null && (
        <Link to={`/entity/${property.linked_entity_id}`} className="associate-link">
          <Icon name="User" size="sm" />
          View Entity Profile
        </Link>
      )}
      <div
        className="property-actions"
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
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
          className="w-full justify-center"
        />
      </div>
    </div>
  );
}
