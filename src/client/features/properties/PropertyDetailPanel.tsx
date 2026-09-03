import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { AddToInvestigationButton } from '@client/components/common/AddToInvestigationButton';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import { PropertyLocationMap } from '@client/components/visualizations/PropertyLocationMap';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { formatCurrency, formatNumber } from '@client/utils/formatters';
import { cn } from '@client/utils/cn';
import { Button } from '@client/design-system/lib';
import type { Property } from './types';
import styles from './PropertyDetailPanel.module.css';

interface PropertyDetailPanelProps {
  property: Property | null;
  onClose: () => void;
}

export function PropertyDetailPanel({
  property,
  onClose,
}: PropertyDetailPanelProps): React.ReactElement | null {
  useScrollLock(!!property);
  const backLinkState = useBackLinkState();

  if (!property) return null;

  const isAssociate = property.is_known_associate === 1;
  const isSubjectParcel =
    property.pcn === '50434327060000391' && property.owner_name_1 === 'EPSTEIN JEFFREY';
  const isSurnameMatch = property.is_epstein_property === 1 && !isSubjectParcel;
  const hasVerifiedPhoto =
    Boolean(property.photo_media_id) && property.photo_verification_status === 'verified';
  const parcelUrl = `https://pbcpao.gov/Property/Summary?parcelId=${encodeURIComponent(property.pcn)}`;

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={cn(styles.panel, isAssociate && styles.panelFlagged)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-detail-title"
      >
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerBadges}>
              {isSubjectParcel && (
                <span className={cn(styles.badge, styles.badgeEpstein)}>
                  <Icon name="ShieldCheck" size="xs" />
                  Subject parcel
                </span>
              )}
              {isAssociate && (
                <span className={cn(styles.badge, styles.badgeAssociate)}>
                  <Icon name="Link" size="xs" />
                  Entity-linked owner
                </span>
              )}
              {isSurnameMatch && (
                <span className={styles.badge}>Owner-name match · review required</span>
              )}
            </div>
            <h3 id="property-detail-title" className={styles.ownerName}>
              {property.linked_entity_id ? (
                <Link
                  to={`/entity/${property.linked_entity_id}`}
                  state={backLinkState}
                  onClick={onClose}
                >
                  {property.owner_name_1 || 'Unknown Owner'}
                </Link>
              ) : (
                property.owner_name_1 || 'Unknown Owner'
              )}
            </h3>
            {property.owner_name_2 && <p className={styles.ownerName2}>{property.owner_name_2}</p>}
            <p className={styles.propertyValue}>
              {formatCurrency(property.total_tax_value)} assessed value
            </p>
          </div>
          <Button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close property details"
            type="button"
            size="sm"
            variant="ghost"
            iconOnly
          >
            <Icon name="X" size="md" />
          </Button>
        </div>

        <div className={styles.content}>
          <div className={styles.photoPanel}>
            {hasVerifiedPhoto ? (
              <img
                src={`/api/media/images/${encodeURIComponent(property.photo_media_id!)}/file`}
                alt={property.photo_title || 'Verified archive property photograph'}
                className={styles.propertyPhoto}
              />
            ) : (
              <div className={styles.photoPlaceholder}>
                <Icon name="Home" size="xl" />
                <span>No verified archive photo is linked to this parcel</span>
              </div>
            )}
            {hasVerifiedPhoto && (
              <div className={styles.photoMetadata}>
                <span>
                  <Icon name="BadgeCheck" size="xs" /> Verified archive image
                </span>
                <strong>{property.photo_title}</strong>
                {property.photo_description && <p>{property.photo_description}</p>}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Icon name="MapPin" size="sm" className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>Location</span>
            </div>
            <p className={styles.address}>
              {property.site_address || property.street_name || 'Address N/A'}
              {property.address_source === 'name_derived' && (
                <span className={styles.derivedNote} title="Inferred from owner name">
                  {' '}
                  (inferred)
                </span>
              )}
              {property.address_source === 'document_verified' && (
                <span className={styles.derivedNote} title="Restored from source evidence">
                  {' '}
                  (evidence verified)
                </span>
              )}
            </p>
            {property.pcn && <p className={styles.pcn}>PCN: {property.pcn}</p>}
            <a href={parcelUrl} target="_blank" rel="noreferrer" className={styles.officialLink}>
              <Icon name="ExternalLink" size="xs" />
              Open official Palm Beach County parcel record
            </a>
            {property.site_address && (
              <PropertyLocationMap
                address={property.site_address}
                ownerName={property.owner_name_1 ?? 'Property'}
              />
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Icon name="Home" size="sm" className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>Property Details</span>
            </div>
            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Type</span>
                <span className={styles.detailValue}>{property.property_use || 'N/A'}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Year Built</span>
                <span className={styles.detailValue}>{property.year_built || 'N/A'}</span>
              </div>
              {property.bedrooms !== null && property.bedrooms > 0 && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Bedrooms</span>
                  <span className={styles.detailValue}>{property.bedrooms}</span>
                </div>
              )}
              {property.full_bathrooms !== null && property.full_bathrooms > 0 && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Full Baths</span>
                  <span className={styles.detailValue}>{property.full_bathrooms}</span>
                </div>
              )}
              {property.half_bathrooms !== null && property.half_bathrooms > 0 && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Half Baths</span>
                  <span className={styles.detailValue}>{property.half_bathrooms}</span>
                </div>
              )}
              {property.stories !== null && property.stories > 0 && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Stories</span>
                  <span className={styles.detailValue}>{property.stories}</span>
                </div>
              )}
              {property.acres !== null && property.acres > 0 && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Acres</span>
                  <span className={styles.detailValue}>{property.acres.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Icon name="Building2" size="sm" className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>Valuation</span>
            </div>
            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Assessed Value</span>
                <span className={cn(styles.detailValue, styles.valueHighlight)}>
                  {formatCurrency(property.total_tax_value)}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Building Value</span>
                <span className={styles.detailValue}>
                  {formatCurrency(property.building_value)}
                </span>
              </div>
              {property.living_area !== null && property.living_area > 0 && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Living Area</span>
                  <span className={styles.detailValue}>
                    {formatNumber(property.living_area)} sqft
                  </span>
                </div>
              )}
              {property.building_area !== null && property.building_area > 0 && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Building Area</span>
                  <span className={styles.detailValue}>
                    {formatNumber(property.building_area)} sqft
                  </span>
                </div>
              )}
            </div>
          </div>

          {isAssociate && property.linked_entity_id !== null && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Icon name="User" size="sm" className={styles.sectionIcon} />
                <span className={styles.sectionTitle}>Investigative Context</span>
              </div>
              <Link
                to={`/entity/${property.linked_entity_id}`}
                state={backLinkState}
                onClick={onClose}
                className={styles.entityLink}
              >
                <Icon name="User" size="sm" />
                View Entity Profile
              </Link>
              <p className={styles.contextNote}>
                This owner record links to an archive entity. The link guides review and does not,
                by itself, establish ownership by a specific person or wrongdoing.
              </p>
            </div>
          )}

          <div className={styles.actions}>
            <AddToInvestigationButton
              item={{
                id: String(property.id),
                title: `${property.owner_name_1 ?? 'Unknown'} - ${property.site_address ?? property.street_name ?? 'Unknown Address'}`,
                description: `${property.property_use ?? 'Property'} with an assessed value of ${formatCurrency(property.total_tax_value)}${isAssociate ? ' (entity-linked owner)' : ''}`,
                type: 'property',
                sourceId: String(property.id),
                metadata: {
                  owner: property.owner_name_1,
                  address: property.site_address ?? property.street_name,
                  value: property.total_tax_value,
                  isKnownAssociate: isAssociate,
                  linkedEntityId: property.linked_entity_id,
                  photoMediaId: property.photo_media_id,
                },
              }}
              variant="button"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
