import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './EntityPropertiesTab.module.css';

interface EntityProperty {
  id: number;
  pcn: string;
  owner_name_1: string | null;
  owner_name_2: string | null;
  site_address: string | null;
  street_name: string | null;
  total_tax_value: number | null;
  acres: number | null;
  property_use: string | null;
  year_built: number | null;
  bedrooms: number | null;
  full_bathrooms: number | null;
  half_bathrooms: number | null;
  building_area: number | null;
  living_area: number | null;
  is_epstein_property: number;
  is_known_associate: number;
}

interface EntityPropertiesTabProps {
  entityId: string;
}

export const EntityPropertiesTab: React.FC<EntityPropertiesTabProps> = ({ entityId }) => {
  const { data, isLoading, isError } = useQuery<{ properties: EntityProperty[] }>({
    queryKey: ['entity-properties', entityId],
    queryFn: async () => {
      const res = await fetch(`/api/entities/${entityId}/properties`);
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json() as Promise<{ properties: EntityProperty[] }>;
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });

  const properties = data?.properties ?? [];

  const formatCurrency = (value: number | null): string => {
    if (value == null) return 'Value unknown';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={s.tabContainer} data-testid="entity-modal-tab-properties">
      <div className={s.header}>
        <h3 className={s.headerTitle}>
          <Building2 size={16} className={s.propertyIcon} />
          Properties
        </h3>
        <div className={s.countBadge}>
          {isLoading
            ? 'Loading…'
            : `${properties.length} propert${properties.length !== 1 ? 'ies' : 'y'}`}
        </div>
      </div>

      <div className={s.listContainer}>
        {isLoading && (
          <div className={s.skeletonStack}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={s.skeletonCard} />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className={s.emptyState}>
            <Building2 size={48} className={s.emptyIcon} />
            <h4 className={s.emptyTitle}>Properties could not be loaded</h4>
            <p className={s.emptyText}>The properties endpoint returned an error.</p>
          </div>
        )}

        {!isLoading && !isError && properties.length === 0 && (
          <div className={s.emptyState}>
            <Building2 size={48} className={s.emptyIcon} />
            <h4 className={s.emptyTitle}>No Properties Linked</h4>
            <p className={s.emptyText}>
              No properties are linked to this entity in the property records.
            </p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          properties.map((prop) => (
            <div key={prop.id} className={s.card}>
              <div className={s.cardTop}>
                <div className={s.address}>
                  <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {prop.site_address || prop.street_name || 'Address unavailable'}
                </div>
                <div className={s.value}>
                  <DollarSign size={12} style={{ display: 'inline' }} />
                  {formatCurrency(prop.total_tax_value)}
                </div>
              </div>

              <div className={s.meta}>
                {prop.property_use && <span className={s.metaChip}>{prop.property_use}</span>}
                {prop.year_built && <span className={s.metaChip}>Built {prop.year_built}</span>}
                {prop.bedrooms != null && prop.bedrooms > 0 && (
                  <span className={s.metaChip}>{prop.bedrooms} bed</span>
                )}
                {prop.building_area != null && (
                  <span className={s.metaChip}>{prop.building_area.toLocaleString()} sq ft</span>
                )}
                {prop.is_epstein_property === 1 && (
                  <span className={s.epsteinBadge}>Epstein Property</span>
                )}
              </div>

              <Link to={`/properties?id=${prop.id}`} className={s.viewLink}>
                View in Properties →
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
};
