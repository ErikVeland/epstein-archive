import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { AddToInvestigationButton } from '@client/components/common/AddToInvestigationButton';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import { formatCurrency, formatNumber } from '@client/utils/formatters';
import { cn } from '@client/utils/cn';
import { Badge, Button } from '@client/design-system/lib';
import type { Property } from './types';
import styles from './PropertyCard.module.css';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
}

export function PropertyCard({ property, onSelect }: PropertyCardProps): React.ReactElement {
  const backLinkState = useBackLinkState();
  const address = property.site_address || property.street_name;
  const hasVerifiedPhoto =
    Boolean(property.photo_media_id) && property.photo_verification_status === 'verified';
  const isSubjectParcel =
    property.pcn === '50434327060000391' && property.owner_name_1 === 'EPSTEIN JEFFREY';
  const isSurnameMatch = property.is_epstein_property === 1 && !isSubjectParcel;
  const parcelUrl = `https://pbcpao.gov/Property/Summary?parcelId=${encodeURIComponent(property.pcn)}`;

  return (
    <article
      className={cn(styles.card, property.is_known_associate === 1 && styles.flagged)}
      onClick={() => onSelect(property)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => event.key === 'Enter' && onSelect(property)}
    >
      <div className={styles.media}>
        {hasVerifiedPhoto ? (
          <img
            src={`/api/media/images/${encodeURIComponent(property.photo_media_id!)}/thumbnail`}
            alt={`${property.photo_title || 'Verified archive photograph'} for ${address || property.owner_name_1 || 'property record'}`}
            loading="lazy"
            className={styles.photo}
          />
        ) : (
          <div className={styles.photoPlaceholder}>
            <Icon name="Home" size="xl" />
            <span>{property.property_use || 'Palm Beach property'}</span>
            <small>No verified archive photo linked</small>
          </div>
        )}

        <div className={styles.badges}>
          {isSubjectParcel && (
            <Badge tone="danger" className={styles.badge}>
              <Icon name="ShieldCheck" size="xs" /> Subject parcel
            </Badge>
          )}
          {property.is_known_associate === 1 && (
            <Badge tone="warning" className={styles.badge}>
              <Icon name="Link" size="xs" /> Entity-linked owner
            </Badge>
          )}
          {isSurnameMatch && (
            <Badge
              tone="neutral"
              className={styles.matchBadge}
              title="Automated owner-name match; not proof of identity"
            >
              Owner-name match
            </Badge>
          )}
        </div>

        {hasVerifiedPhoto && (
          <div className={styles.photoCredit}>
            <Icon name="BadgeCheck" size="xs" /> Verified archive image
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Assessed value</p>
            <span className={styles.propertyValue}>{formatCurrency(property.total_tax_value)}</span>
          </div>
          <span className={styles.propertyType}>{property.property_use || 'Unclassified'}</span>
        </div>

        <h4 className={styles.address}>
          <Icon name="MapPin" size="sm" />
          <span>{address || `Palm Beach County parcel ${property.pcn}`}</span>
          {property.address_source === 'name_derived' && (
            <span className={styles.derivedBadge} title="Address inferred from the owner name">
              Inferred
            </span>
          )}
          {property.address_source === 'document_verified' && (
            <span className={styles.derivedBadge} title="Address restored from source evidence">
              Evidence verified
            </span>
          )}
        </h4>
        <p className={styles.ownerName}>Owner of record: {property.owner_name_1 || 'Not listed'}</p>
        {property.owner_name_2 && <p className={styles.secondaryOwner}>{property.owner_name_2}</p>}

        <div className={styles.facts} aria-label="Property facts">
          {property.bedrooms !== null && property.bedrooms > 0 && (
            <span>
              <strong>{property.bedrooms}</strong> beds
            </span>
          )}
          {property.full_bathrooms !== null && property.full_bathrooms > 0 && (
            <span>
              <strong>{property.full_bathrooms}</strong> baths
            </span>
          )}
          {property.living_area !== null && property.living_area > 0 && (
            <span>
              <strong>{formatNumber(property.living_area)}</strong> sq ft
            </span>
          )}
          {property.acres !== null && property.acres > 0 && (
            <span>
              <strong>{property.acres.toFixed(2)}</strong> acres
            </span>
          )}
          {property.year_built && (
            <span>
              <strong>{property.year_built}</strong> built
            </span>
          )}
        </div>

        <div className={styles.recordContext}>
          <div>
            <span className={styles.valueLabel}>Building value</span>
            <span className={styles.valueText}>{formatCurrency(property.building_value)}</span>
          </div>
          <div>
            <span className={styles.valueLabel}>Parcel control number</span>
            <span className={styles.pcn}>{property.pcn}</span>
          </div>
        </div>

        <div className={styles.recordLinks}>
          <a
            href={parcelUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className={styles.recordLink}
          >
            <Icon name="ExternalLink" size="xs" /> Official parcel record
          </a>
          {property.is_known_associate === 1 && property.linked_entity_id !== null && (
            <Link
              to={`/entity/${property.linked_entity_id}`}
              state={backLinkState}
              onClick={(event) => event.stopPropagation()}
              className={styles.recordLink}
            >
              <Icon name="User" size="xs" /> Entity profile
            </Link>
          )}
        </div>

        <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={styles.detailsButton}
            onClick={() => onSelect(property)}
          >
            View property dossier <Icon name="ArrowRight" size="sm" />
          </Button>
          <AddToInvestigationButton
            item={{
              id: String(property.id),
              title: `${property.owner_name_1 ?? 'Unknown'} - ${address ?? 'Unknown Address'}`,
              description: `${property.property_use ?? 'Property'} with an assessed value of ${formatCurrency(property.total_tax_value)}${property.is_known_associate ? ' (entity-linked owner)' : ''}`,
              type: 'property',
              sourceId: String(property.id),
              metadata: {
                owner: property.owner_name_1,
                address,
                value: property.total_tax_value,
                isKnownAssociate: property.is_known_associate === 1,
                linkedEntityId: property.linked_entity_id,
                photoMediaId: property.photo_media_id,
              },
            }}
            variant="quick"
            className={styles.addButton}
          />
        </div>
      </div>
    </article>
  );
}
